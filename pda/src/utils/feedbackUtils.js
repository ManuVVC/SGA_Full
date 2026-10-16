/**
 * feedbackUtils.js
 * Utilidades de retroalimentación acústica (Web Audio API) y háptica (Vibration API)
 * para acelerar la operativa de almacén sin obligar al operario a mirar la pantalla.
 */

let audioCtx = null;

function getAudioContext() {
  if (typeof window === 'undefined') return null;
  if (!audioCtx) {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (AudioContextClass) {
      try {
        audioCtx = new AudioContextClass();
      } catch (e) {
        return null;
      }
    }
  }
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume().catch(() => {});
  }
  return audioCtx;
}

function playTone(freq, durationMs, type = 'sine', delayMs = 0, gainVal = 0.15) {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    const startTime = ctx.currentTime + delayMs / 1000;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(freq, startTime);

    gain.gain.setValueAtTime(gainVal, startTime);
    gain.gain.exponentialRampToValueAtTime(0.001, startTime + durationMs / 1000);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(startTime);
    osc.stop(startTime + durationMs / 1000);
  } catch (e) {
    // Silenciar errores si el navegador bloquea el audio
  }
}

function vibrate(pattern) {
  try {
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate(pattern);
    }
  } catch (e) {
    // Ignorar en dispositivos sin motor háptico
  }
}

/**
 * Feedback de lectura correcta (Ubicación validada, Artículo correcto, Lote seleccionado)
 */
export function playScanSuccess() {
  playTone(1250, 75, 'sine', 0, 0.14);
  vibrate(35);
}

/**
 * Feedback de línea completada (Mercancía cargada con éxito)
 */
export function playLineCompleted() {
  playTone(950, 65, 'sine', 0, 0.14);
  playTone(1450, 110, 'sine', 70, 0.16);
  vibrate([40, 30, 60]);
}

/**
 * Feedback de advertencia (Exceso de mercancía, Múltiples posiciones, Mercancía previa en carrito)
 */
export function playWarningFeedback() {
  playTone(580, 110, 'triangle', 0, 0.18);
  playTone(580, 110, 'triangle', 140, 0.18);
  vibrate([80, 50, 80]);
}

/**
 * Feedback de error (Ubicación incorrecta, Artículo no pedido, Sin stock)
 */
export function playErrorFeedback() {
  playTone(260, 160, 'sawtooth', 0, 0.2);
  playTone(220, 220, 'sawtooth', 180, 0.22);
  vibrate([160, 70, 180]);
}
