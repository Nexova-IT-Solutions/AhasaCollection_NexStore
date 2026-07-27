const ExcelJS = require('exceljs');

async function readExcel() {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile('C:\\Users\\PC\\Downloads\\Book1.xlsx');
  
  const worksheet = workbook.worksheets[0]; // first sheet
  const rows = [];
  
  worksheet.eachRow({ includeEmpty: false }, function(row, rowNumber) {
    if (rowNumber <= 6) { // header + 5 rows
      rows.push(row.values);
    }
  });
  
  console.log(JSON.stringify(rows, null, 2));
}

readExcel().catch(console.error);
