/**
 * getClientIP.js
 *
 * Detecta la IP local del dispositivo (PDA) usando WebRTC ICE candidates.
 * El navegador negocia conexiones P2P y expone las IPs locales del adaptador
 * de red en el proceso — sin necesidad de servidores STUN/TURN externos.
 *
 * Contexto: Docker Desktop en Windows NAT-ea todas las conexiones entrantes
 * a través de 172.19.0.1, perdiendo la IP real del cliente. Esta utilidad
 * permite que la PDA envíe su propia IP en una cabecera X-Terminal-IP para
 * que el backend pueda identificar el terminal correctamente en TMST_TERMINALES.
 *
 * @returns {Promise<string|null>} La IP privada del dispositivo, o null si falla.
 */
export const getClientIP = () =>
  new Promise((resolve) => {
    const ips = new Set();
    let resolved = false;

    const finish = (ip) => {
      if (resolved) return;
      resolved = true;
      resolve(ip || null);
    };

    // Timeout de seguridad: si WebRTC tarda más de 3s, resolvemos con null
    const timeout = setTimeout(() => finish(null), 3000);

    let pc;
    try {
      pc = new RTCPeerConnection({ iceServers: [] });
    } catch {
      clearTimeout(timeout);
      return resolve(null);
    }

    // Creamos un canal de datos para activar la negociación ICE
    pc.createDataChannel('');

    pc.onicecandidate = (event) => {
      if (!event.candidate) {
        // null candidate = fin de la recolección ICE
        clearTimeout(timeout);
        pc.close();

        // Preferimos IPs de red privada LAN (192.168.x.x, 10.x.x.x)
        // sobre otras (169.254.x.x, 172.16-31.x.x del docker, etc.)
        const lanIP = [...ips].find((ip) => /^192\.168\.|^10\./.test(ip));
        finish(lanIP || [...ips][0] || null);
        return;
      }

      // Extraer IPs IPv4 del candidate string
      const matches = event.candidate.candidate.matchAll(
        /(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})/g
      );
      for (const match of matches) {
        const ip = match[1];
        // Ignorar loopback y direcciones de link-local
        if (ip !== '0.0.0.0' && !ip.startsWith('127.') && !ip.startsWith('169.254.')) {
          ips.add(ip);
        }
      }
    };

    pc.createOffer()
      .then((offer) => pc.setLocalDescription(offer))
      .catch(() => {
        clearTimeout(timeout);
        resolve(null);
      });
  });

/**
 * Obtiene y almacena en caché la IP local del dispositivo en sessionStorage.
 * Llama a esta función al inicio de la app para que esté lista cuando se
 * necesite identificar el terminal.
 *
 * @returns {Promise<string|null>}
 */
export const initClientIP = async () => {
  const cached = sessionStorage.getItem('sga_terminal_ip');
  if (cached) return cached;

  const ip = await getClientIP();
  if (ip) {
    sessionStorage.setItem('sga_terminal_ip', ip);
    console.info(`[SGA] IP del terminal detectada: ${ip}`);
  } else {
    console.warn('[SGA] No se pudo detectar la IP del terminal via WebRTC.');
  }
  return ip;
};
