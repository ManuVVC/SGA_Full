const XLSX = require('xlsx');

const csvData = "col1,col2\nval1,val2";

// Simulando exportGridToExcel
const workbook = XLSX.read(csvData, { type: 'string', raw: true });
XLSX.writeFile(workbook, `test_output.xlsx`);

console.log("File written");
