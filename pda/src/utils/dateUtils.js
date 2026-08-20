/**
 * Utilidades para manejo y formateo de fechas en español (DD-MM-AAAA) en la PDA.
 */

/**
 * Convierte una cadena de fecha (o Date) a formato español DD-MM-AAAA para mostrar al operario.
 */
export const formatFechaES = (dateVal) => {
  if (!dateVal) return '';
  if (dateVal instanceof Date) {
    if (isNaN(dateVal.getTime())) return '';
    const dd = String(dateVal.getDate()).padStart(2, '0');
    const mm = String(dateVal.getMonth() + 1).padStart(2, '0');
    const yyyy = dateVal.getFullYear();
    return `${dd}-${mm}-${yyyy}`;
  }
  const str = String(dateVal).trim().split('T')[0].split(' ')[0];
  // Si está en formato YYYY-MM-DD o YYYY/MM/DD o YYYY.MM.DD
  const ymdMatch = str.match(/^(\d{4})[-/.](\d{2})[-/.](\d{2})$/);
  if (ymdMatch) {
    return `${ymdMatch[3]}-${ymdMatch[2]}-${ymdMatch[1]}`;
  }
  // Si ya está en formato DD-MM-YYYY o DD/MM/YYYY
  const dmyMatch = str.match(/^(\d{2})[-/.](\d{2})[-/.](\d{4})$/);
  if (dmyMatch) {
    return `${dmyMatch[1]}-${dmyMatch[2]}-${dmyMatch[3]}`;
  }
  return str;
};

/**
 * Convierte una cadena de fecha al formato ISO YYYY-MM-DD esperado por el backend.
 */
export const toYYYYMMDD = (dateVal) => {
  if (!dateVal) return null;
  if (dateVal instanceof Date) {
    if (isNaN(dateVal.getTime())) return null;
    const yyyy = dateVal.getFullYear();
    const mm = String(dateVal.getMonth() + 1).padStart(2, '0');
    const dd = String(dateVal.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  }
  const str = String(dateVal).trim().split('T')[0].split(' ')[0];
  // Si está en formato DD-MM-YYYY o DD/MM/YYYY
  const dmyMatch = str.match(/^(\d{2})[-/.](\d{2})[-/.](\d{4})$/);
  if (dmyMatch) {
    return `${dmyMatch[3]}-${dmyMatch[2]}-${dmyMatch[1]}`;
  }
  // Si ya está en formato YYYY-MM-DD
  const ymdMatch = str.match(/^(\d{4})[-/.](\d{2})[-/.](\d{2})$/);
  if (ymdMatch) {
    return `${ymdMatch[1]}-${ymdMatch[2]}-${ymdMatch[3]}`;
  }
  return str;
};

/**
 * Parsea una cadena en formato DD, DDMM o DDMMAA a una fecha formateada en DD-MM-AAAA para visualización.
 */
export const parseShorthandDate = (input) => {
  if (!input) return '';
  if (input.includes('-') || input.includes('/')) {
    return formatFechaES(input);
  }
  
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = String(now.getMonth() + 1).padStart(2, '0');
  
  const clean = input.replace(/\D/g, '');
  
  if (clean.length === 1 || clean.length === 2) {
    const dd = clean.padStart(2, '0');
    return `${dd}-${currentMonth}-${currentYear}`;
  } else if (clean.length === 4) {
    const dd = clean.substring(0, 2);
    const mm = clean.substring(2, 4);
    return `${dd}-${mm}-${currentYear}`;
  } else if (clean.length === 6) {
    const dd = clean.substring(0, 2);
    const mm = clean.substring(2, 4);
    const aa = clean.substring(4, 6);
    return `${dd}-${mm}-20${aa}`;
  } else if (clean.length === 8) {
    const dd = clean.substring(0, 2);
    const mm = clean.substring(2, 4);
    const yyyy = clean.substring(4, 8);
    return `${dd}-${mm}-${yyyy}`;
  }
  
  return formatFechaES(input);
};

/**
 * Crea un objeto Date válido en JS a partir de una cadena en formato DD-MM-YYYY o YYYY-MM-DD.
 */
export const parseDateES = (dateStr) => {
  if (!dateStr) return null;
  const str = String(dateStr).trim();
  const dmyMatch = str.match(/^(\d{2})[-/.](\d{2})[-/.](\d{4})$/);
  if (dmyMatch) {
    return new Date(dmyMatch[3], parseInt(dmyMatch[2], 10) - 1, dmyMatch[1]);
  }
  const ymdMatch = str.match(/^(\d{4})[-/.](\d{2})[-/.](\d{2})$/);
  if (ymdMatch) {
    return new Date(ymdMatch[1], parseInt(ymdMatch[2], 10) - 1, ymdMatch[3]);
  }
  const d = new Date(str);
  return isNaN(d.getTime()) ? null : d;
};
