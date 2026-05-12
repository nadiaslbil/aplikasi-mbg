import * as XLSX from 'xlsx';

/**
 * Export array of objects to Excel file
 * @param data - Array of objects to export
 * @param fileName - Desired file name (without extension)
 * @param sheetName - Name of the worksheet
 */
export const exportToExcel = (data: any[], fileName: string, sheetName: string = 'Sheet1') => {
  try {
    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
    
    // Generate buffer and trigger download
    XLSX.writeFile(workbook, `${fileName}_${new Date().toISOString().split('T')[0]}.xlsx`);
    return true;
  } catch (error) {
    console.error('Excel Export Error:', error);
    return false;
  }
};
