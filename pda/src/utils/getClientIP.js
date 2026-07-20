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
 * Devuelve true si la IP es una dirección LAN real (no Docker ni loopback).
 * Usado para filtrar IPs de gateway/Docker que no identifican un terminal físico.
 * Acepta 192.168.x.x y 10.x.x.x como IPs de LAN válidas.
 */
const esIpLanReal = (ip) => {
  if (!ip || typeof ip !== 'string') return false;
  const parts = ip.split('.');
  if (parts.length !== 4) return false;
  const [a, b] = parts.map(Number);
  if (isNaN(a) || isNaN(b)) return false;
  if (a === 127) return false;                        // loopback
  if (a === 169 && b === 254) return false;           // link-local
  if (a === 172 && b >= 16 && b <= 31) return false; // Docker/private bridge
  return true;
};

/**
 * Obtiene y almacena en caché la IP local del dispositivo en sessionStorage.
 * Cadena de prioridad (de más a menos fiable):
 *
 *   1. Parámetro URL ?terminal_ip=X   (síncrono, 100% fiable, ideal para bookmark PDA)
 *   2. window.__NGINX_IP__            (inyectada por Nginx sub_filter al servir index.html,
 *                                      síncrono, sin WebRTC, funciona en todos los navegadores)
 *   3. Caché en sessionStorage        (sesión anterior ya resuelta)
 *   4. WebRTC                         (fallback async, puede estar bloqueado en PDAs)
 *
 * @returns {Promise<string|null>}
 */
export const initClientIP = async () => {
  // 1. Parámetro de URL (ya guardado síncronamente en apiService.js al arrancar)
  const cached = sessionStorage.getItem('sga_terminal_ip');
  if (cached) {
    console.info(`[SGA] IP del terminal desde caché: ${cached}`);
    return cached;
  }

  // 2. IP inyectada por Nginx (window.__NGINX_IP__)
  //    Nginx la pone vía sub_filter en nginx.conf: window.__NGINX_IP__="$remote_addr"
  //    Si Docker Desktop preserva la IP real (modo mirrored/WSL2) es la IP del terminal.
  //    Si la NAT (modo vpnkit), es el gateway Docker → la descartamos con esIpLanReal.
  const nginxIp = window.__NGINX_IP__;
  if (esIpLanReal(nginxIp)) {
    sessionStorage.setItem('sga_terminal_ip', nginxIp);
    console.info(`[SGA] IP del terminal detectada via Nginx: ${nginxIp}`);
    return nginxIp;
  }
  if (nginxIp) {
    console.warn(`[SGA] IP de Nginx descartada (Docker/interna): ${nginxIp}`);
  }

  // 3. WebRTC (fallback, puede estar bloqueado en navegadores modernos o PDAs)
  const ip = await getClientIP();
  if (ip) {
    sessionStorage.setItem('sga_terminal_ip', ip);
    console.info(`[SGA] IP del terminal detectada via WebRTC: ${ip}`);
    return ip;
  }

  console.warn(
    '[SGA] No se pudo detectar la IP del terminal automáticamente. ' +
    'Accede con ?terminal_ip=TU.IP en la URL (ej: http://servidor:5173/?terminal_ip=192.168.5.178)'
  );
  return null;
};
