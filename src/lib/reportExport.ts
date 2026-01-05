import * as XLSX from 'xlsx';

export interface ReportData {
  companyName: string;
  driverName: string;
  period: string;
  orders: Array<{
    id: string;
    date: string;
    dropoffAddress: string;
    value: number;
  }>;
  totalValue: number;
}

// Format currency for BR
export const formatCurrency = (value: number): string => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
};

// Format date for BR
export const formatDate = (date: Date | string): string => {
  return new Date(date).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
};

// Export to Excel
export const exportToExcel = (data: ReportData, filename: string) => {
  const worksheetData = [
    ['RELATÓRIO DE ENTREGAS - FLUX'],
    [],
    ['Entregador:', data.driverName],
    ['Empresa:', data.companyName],
    ['Período:', data.period],
    [],
    ['Data', 'ID do Pedido', 'Endereço de Entrega', 'Valor'],
    ...data.orders.map(order => [
      order.date,
      order.id.slice(0, 8).toUpperCase(),
      order.dropoffAddress.length > 50 ? order.dropoffAddress.slice(0, 50) + '...' : order.dropoffAddress,
      formatCurrency(order.value),
    ]),
    [],
    ['', '', 'TOTAL:', formatCurrency(data.totalValue)],
  ];

  const worksheet = XLSX.utils.aoa_to_sheet(worksheetData);
  
  // Set column widths
  worksheet['!cols'] = [
    { wch: 12 },
    { wch: 15 },
    { wch: 50 },
    { wch: 15 },
  ];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Relatório');
  
  XLSX.writeFile(workbook, `${filename}.xlsx`);
};

// Export consolidated report to Excel
export const exportConsolidatedToExcel = (
  driverName: string,
  period: string,
  groups: Array<{
    name: string;
    orders: Array<{
      id: string;
      date: string;
      dropoffAddress: string;
      value: number;
    }>;
    totalValue: number;
  }>,
  filename: string
) => {
  const worksheetData: any[][] = [
    ['RELATÓRIO CONSOLIDADO DE ENTREGAS - FLUX'],
    [],
    ['Entregador:', driverName],
    ['Período:', period],
    [],
  ];

  let grandTotal = 0;

  groups.forEach((group, index) => {
    worksheetData.push(
      [],
      [`${group.name}`],
      ['Data', 'ID do Pedido', 'Endereço de Entrega', 'Valor'],
    );

    group.orders.forEach(order => {
      worksheetData.push([
        order.date,
        order.id.slice(0, 8).toUpperCase(),
        order.dropoffAddress.length > 50 ? order.dropoffAddress.slice(0, 50) + '...' : order.dropoffAddress,
        formatCurrency(order.value),
      ]);
    });

    worksheetData.push(['', '', `Subtotal:`, formatCurrency(group.totalValue)]);
    grandTotal += group.totalValue;
  });

  worksheetData.push(
    [],
    ['', '', 'TOTAL GERAL:', formatCurrency(grandTotal)],
  );

  const worksheet = XLSX.utils.aoa_to_sheet(worksheetData);
  
  worksheet['!cols'] = [
    { wch: 12 },
    { wch: 15 },
    { wch: 50 },
    { wch: 15 },
  ];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Relatório Consolidado');
  
  XLSX.writeFile(workbook, `${filename}.xlsx`);
};

// Get month name in Portuguese
export const getMonthName = (monthStr: string): string => {
  const [year, month] = monthStr.split('-').map(Number);
  const date = new Date(year, month - 1);
  return date.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
};
