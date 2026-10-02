import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
// I-import ang mismong interface mo
import type { ITAsset, HistoryEntry, Company } from '@/types/inventory';

// CSV Export for Inventory
export const exportToCSV = (data: ITAsset[], filename: string = 'inventory_export.csv') => {
  if (!data || data.length === 0) {
    alert('No data to export');
    return;
  }

  const headers = [
    'Device Code', 'Device Name', 'Category', 'Brand', 'Model', 
    'Serial Number', 'Company', 'Status', 'Assigned To', 
    'Location', 'Purchase Date', 'Warranty Expiry', 'Notes'
  ];

  const csvContent = [
    headers.join(','),
    ...data.map(asset => [
      `"${asset.deviceCode}"`,
      `"${asset.name}"`, // asset.name na gamit mo, hindi deviceName
      `"${asset.category}"`,
      `"${asset.brand}"`,
      `"${asset.model}"`,
      `"${asset.serialNumber}"`,
      `"${asset.company}"`,
      `"${asset.status}"`,
      `"${asset.assignedTo || 'Unassigned'}"`,
      `"${asset.location}"`,
      `"${asset.purchaseDate}"`,
      `"${asset.warrantyExpiry || ''}"`,
      `"${(asset.notes || '').replace(/"/g, '""')}"`
    ].join(','))
  ].join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.setAttribute('href', URL.createObjectURL(blob));
  link.setAttribute('download', filename);
  link.click();
};

// ── Furniture / general-asset exports ────────────────────────────────────
const STATUS_LABEL: Record<string, string> = {
  active: 'In Use',
  available: 'Available',
  'in-storage': 'In Storage',
  'in-maintenance': 'Under Repair',
  disposed: 'Disposed',
};

const fmtDate = (d?: string) => (d ? new Date(d).toLocaleDateString() : '');

export const exportFurnitureCSV = (data: ITAsset[], filename = 'furniture_export.csv') => {
  if (!data || data.length === 0) {
    alert('No data to export');
    return;
  }
  const headers = [
    'Asset Code', 'Furniture Name', 'Category', 'Brand', 'Model', 'Serial Number',
    'Company', 'Assigned To', 'Department', 'Location', 'Condition', 'Status', 'Purchase Date', 'Notes',
  ];
  const csv = [
    headers.join(','),
    ...data.map((a) => [
      a.deviceCode, a.name, a.category, a.brand, a.model, a.serialNumber,
      a.company, a.assignedTo || 'Unassigned', a.department || '', a.location,
      a.condition || '', STATUS_LABEL[a.status] || a.status, fmtDate(a.purchaseDate), a.notes || '',
    ].map((v) => `"${String(v ?? '').replace(/"/g, '""')}"`).join(',')),
  ].join('\n');

  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.setAttribute('href', URL.createObjectURL(blob));
  link.setAttribute('download', filename);
  link.click();
};

export const exportFurniturePDF = (data: ITAsset[], filename = 'furniture_report.pdf') => {
  if (!data || data.length === 0) {
    alert('No data to export');
    return;
  }
  const doc = new jsPDF('l', 'mm', 'a4');
  const pageWidth = doc.internal.pageSize.width;
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text('Furniture Inventory Report', pageWidth / 2, 20, { align: 'center' });
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`Generated: ${new Date().toLocaleDateString()}`, pageWidth / 2, 28, { align: 'center' });

  autoTable(doc, {
    startY: 35,
    head: [['Code', 'Name', 'Category', 'Company', 'Assigned To', 'Department', 'Location', 'Condition', 'Status']],
    body: data.map((a) => [
      a.deviceCode, a.name, a.category, a.company, a.assignedTo || '-',
      a.department || '-', a.location, a.condition || '-', STATUS_LABEL[a.status] || a.status,
    ]),
    theme: 'striped',
    headStyles: { fillColor: [11, 92, 150], fontSize: 8 },
    styles: { fontSize: 7, cellPadding: 2 },
  });
  doc.save(filename);
};

// PDF Export for Detailed Inventory
export const exportDetailedDevicesPDF = (
  data: ITAsset[],
  filename: string = 'detailed_inventory.pdf'
) => {
  if (!data || data.length === 0) {
    alert('No data to export');
    return;
  }

  const doc = new jsPDF('l', 'mm', 'a4'); // 'l' for landscape para kasya lahat ng columns
  const pageWidth = doc.internal.pageSize.width;
  
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text('Detailed IT Inventory List', pageWidth / 2, 20, { align: 'center' });
  
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`Generated: ${new Date().toLocaleDateString()}`, pageWidth / 2, 28, { align: 'center' });
  
  autoTable(doc, {
    startY: 35,
    head: [[
      'Code', 'Name', 'Category', 'Serial #', 'Company', 
      'User', 'Location', 'Purchase', 'Warranty', 'Status'
    ]],
    body: data.map(asset => [
      asset.deviceCode,
      asset.name,
      asset.category,
      asset.serialNumber,
      asset.company,
      asset.assignedTo || '-',
      asset.location,
      asset.purchaseDate,
      asset.warrantyExpiry || '-',
      asset.status
    ]),
    theme: 'striped',
    headStyles: { fillColor: [52, 73, 94], fontSize: 8 },
    styles: { fontSize: 7, cellPadding: 2 },
  });
  
  doc.save(filename);
};