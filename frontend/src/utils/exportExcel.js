import * as XLSX from 'xlsx';

/**
 * Exporta los datos de un AG Grid a un archivo Excel (.xlsx).
 * Utiliza getDataAsCsv para extraer los datos con sus formatos,
 * y luego los convierte a Excel para mantener las vistas y formatos aplicados.
 *
 * @param {object} gridApi - La instancia de la API de AG Grid
 * @param {string} fileName - Nombre del archivo de salida (sin la extensión)
 */
export const exportGridToExcel = (gridApi, fileName) => {
  if (!gridApi) return;
  
  // Extraemos el CSV del grid, lo que mantiene el formateo de las columnas
  const csvData = gridApi.getDataAsCsv();
  if (!csvData) return;
  
  // Parseamos el string CSV y generamos un libro de Excel
  const workbook = XLSX.read(csvData, { type: 'string', raw: true });
  
  // Generamos la descarga del archivo XLSX
  XLSX.writeFile(workbook, `${fileName}.xlsx`);
};

/**
 * Exporta un array de objetos a un archivo Excel (.xlsx).
 *
 * @param {Array} jsonData - Array de objetos a exportar
 * @param {string} fileName - Nombre del archivo de salida (sin la extensión)
 */
export const exportJsonToExcel = (jsonData, fileName) => {
  if (!jsonData || !jsonData.length) return;
  
  const worksheet = XLSX.utils.json_to_sheet(jsonData);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Datos");
  
  XLSX.writeFile(workbook, `${fileName}.xlsx`);
};
