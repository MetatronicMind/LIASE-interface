import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { formatDateTime } from './dateTimeFormatter';

// Footer text constant
const FOOTER_TEXT = "This was generated using the liase tool , MetatronicMinds Technologies 2026";

export const exportToPDF = (
  title: string, 
  columns: string[], 
  data: any[][], 
  filename: string,
  password?: string,
  footerText: string = FOOTER_TEXT
) => {
  // Initialize jsPDF with encryption if password is provided
  const options: any = {
    orientation: 'landscape'
  };
  if (password) {
    options.encryption = {
      userPassword: password,
      ownerPassword: password,
      userPermissions: ["print", "modify", "copy", "annot-forms"]
    };
  }
  
  const doc = new jsPDF(options);
  
  doc.setFontSize(18);
  doc.text(title, 14, 22);
  
  doc.setFontSize(11);
  doc.setTextColor(100);
  
  // Add timestamp
  const date = formatDateTime(new Date());
  doc.text(`Generated on: ${date}`, 14, 28);
  
  // Adjust style based on column count
  const isDetailed = columns.length > 15;
  
  if (isDetailed) {
     // Detailed Dossier View (Vertical Key-Value Tables per Study)
     let finalY = 35;
     
     data.forEach((row, index) => {
        // Check for page break needed for Header
        const pageHeight = doc.internal.pageSize.getHeight();
        if (finalY > pageHeight - 40) {
           doc.addPage();
           finalY = 20;
        }
        
        // Section Header (ID / Title)
        // Adjust index based on data structure: row[1] is typically PMID or ID
        const recordTitle = `Record #${index + 1} - ${row[1] || 'Report'}`;
        
        doc.setFontSize(12);
        doc.setTextColor(0); // Black
        doc.setFont("helvetica", "bold");
        doc.text(recordTitle, 14, finalY);
        finalY += 6;
        
        doc.setFont("helvetica", "normal"); // Reset font
        
        // Transpose row to columns: [Field Name, Value]
        const tableBody = columns.map((col, i) => [col, row[i]]);
        
        autoTable(doc, {
          startY: finalY,
          head: [['Field', 'Value']],
          body: tableBody,
          theme: 'grid',
          styles: { 
            fontSize: 9, 
            cellPadding: 3, 
            overflow: 'linebreak',
            valign: 'middle'
          },
          headStyles: { 
            fillColor: [66, 139, 202],
            fontStyle: 'bold'
          },
          columnStyles: {
            0: { cellWidth: 80, fontStyle: 'bold', fillColor: [245, 245, 245] }, // Field Name
            1: { cellWidth: 'auto' } // Value takes remaining space
          },
          margin: { left: 14, right: 14 },
          // Ensure we capture the finalY after this table
          didDrawPage: (data) => {
             // Footer logic is shared, but we need to ensure it doesn't double print if we add multiple tables per page?
             // autoTable handles page breaks internally and calls didDrawPage.
             // We just need to print footer at bottom.
             const pageSize = doc.internal.pageSize;
             const ph = pageSize.height ? pageSize.height : pageSize.getHeight();
             doc.setFontSize(8);
             doc.setTextColor(150);
             doc.text(footerText, 14, ph - 10);
          }
        });
        
        finalY = (doc as any).lastAutoTable.finalY + 15; // Space between studies
     });

  } else {
    // Standard Landscape Summary Table (columns <= 15)
    autoTable(doc, {
      head: [columns],
      body: data,
      startY: 35,
      theme: 'grid',
      styles: { 
        fontSize: 8, 
        cellPadding: 2,
        overflow: 'linebreak',
        valign: 'top'
      },
      headStyles: { 
        fillColor: [66, 139, 202],
        valign: 'middle',
        halign: 'center' 
      },
      columnStyles: {
        0: { cellWidth: 25 }, // PMID
        1: { cellWidth: 70 }, // Title
        2: { cellWidth: 35 }, // Drug Name
        8: { cellWidth: 30 }, // Journal
      },
      didDrawPage: (data) => {
        const pageSize = doc.internal.pageSize;
        const pageHeight = pageSize.height ? pageSize.height : pageSize.getHeight();
        doc.setFontSize(8);
        doc.setTextColor(150);
        doc.text(footerText, 14, pageHeight - 10);
      },
    });
  }
  
  doc.save(`${filename}.pdf`);
};

export const exportToExcel = (data: any[], filename: string, sheetName: string = "Sheet1", password?: string) => {
  // Clone data to avoid mutations
  const exportData = [...data];
  
  // Add empty row
  exportData.push({});
  
  // Add footer row
  // We try to put the text in the first column key found in the first row, or just a new key
  const firstKey = data.length > 0 ? Object.keys(data[0])[0] : 'Footer';
  const footerRow: any = {};
  footerRow[firstKey || 'Info'] = FOOTER_TEXT;
  exportData.push(footerRow);

  const ws = XLSX.utils.json_to_sheet(exportData);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, sheetName);
  
  // Note: Client-side XLSX password protection is not supported in the free community version of SheetJS.
  // If password protection is strictly required for Excel, it usually requires a backend service or Pro version.
  
  XLSX.writeFile(wb, `${filename}.xlsx`);
};
