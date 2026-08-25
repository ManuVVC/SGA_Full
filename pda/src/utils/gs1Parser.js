/**
 * gs1Parser.js - Utilidad de parsing GS1-128 para SGA PDA
 */
const GS = '\u001d';
const AIM_PREFIX = ']C1';
const FIXED_LENGTH_AIS = {'00':18,'01':14,'02':14,'03':14,'11':6,'12':6,'13':6,'14':6,'15':6,'16':6,'17':6,'18':6,'19':6,'20':2};
const VARIABLE_LENGTH_AIS = new Set(['10','21','22','30','37','240','241','242','243','250','251','253','254','255','400','401','402','403','410','411','412','413','414','420','421','422','423','424','425','426','90','91','92','93','94','95','96','97','98','99']);
export function parseGs1(rawCode) {
  if (!rawCode) return { isGs1: false };
  let code = rawCode.trim();
  const hadAimPrefix = code.startsWith(AIM_PREFIX);
  if (hadAimPrefix) code = code.slice(AIM_PREFIX.length);
  const isGs1 = code.includes(GS) || /^01\d{14}/.test(code) || hadAimPrefix;
  if (!isGs1) return { isGs1: false };
  const result = { isGs1: true, ean: null, lote: null, caducidad: null, cantidad: null, fechaProduccion: null, raw: {} };
  let pos = 0;
  while (pos < code.length) {
    if (code[pos] === GS) { pos++; continue; }
    const { ai, aiLength } = detectAi(code, pos);
    if (!ai) { const g = code.indexOf(GS, pos); pos = g === -1 ? code.length : g + 1; continue; }
    pos += aiLength;
    let value;
    if (VARIABLE_LENGTH_AIS.has(ai)) { const g = code.indexOf(GS, pos); if (g === -1) { value = code.slice(pos); pos = code.length; } else { value = code.slice(pos, g); pos = g; } }
    else { value = code.slice(pos, pos + FIXED_LENGTH_AIS[ai]); pos += FIXED_LENGTH_AIS[ai]; }
    result.raw[ai] = value;
    if (ai === '01' && value.length === 14) result.ean = value[0] === '0' ? value.slice(1) : value;
    else if (ai === '10') result.lote = value.trim();
    else if (ai === '17') result.caducidad = yymmddToIso(value);
    else if (ai === '11') result.fechaProduccion = yymmddToIso(value);
    else if (ai === '37') { const n = parseInt(value, 10); if (!isNaN(n)) result.cantidad = n; }
  }
  return result;
}
function detectAi(code, pos) {
  const ai4 = code.substr(pos, 4);
  if (FIXED_LENGTH_AIS[ai4] !== undefined || VARIABLE_LENGTH_AIS.has(ai4)) return { ai: ai4, aiLength: 4 };
  const p2 = code.substr(pos, 2);
  if (['31','32','33','34','35','36'].includes(p2) && /^\d{4}$/.test(ai4)) return { ai: ai4, aiLength: 4 };
  const ai3 = code.substr(pos, 3);
  if (FIXED_LENGTH_AIS[ai3] !== undefined || VARIABLE_LENGTH_AIS.has(ai3)) return { ai: ai3, aiLength: 3 };
  const ai2 = code.substr(pos, 2);
  if (FIXED_LENGTH_AIS[ai2] !== undefined || VARIABLE_LENGTH_AIS.has(ai2)) return { ai: ai2, aiLength: 2 };
  return { ai: null, aiLength: 0 };
}
function yymmddToIso(raw) {
  if (!raw || raw.length !== 6) return null;
  const yy = raw.substr(0,2), mm = raw.substr(2,2), dd = raw.substr(4,2);
  const yyyy = parseInt(yy,10) < 50 ? '20'+yy : '19'+yy;
  if (dd === '00') { const last = new Date(parseInt(yyyy,10), parseInt(mm,10), 0).getDate(); return yyyy+'-'+mm+'-'+String(last).padStart(2,'0'); }
  return yyyy+'-'+mm+'-'+dd;
}
