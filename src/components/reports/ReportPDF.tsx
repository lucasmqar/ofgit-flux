import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Font,
  pdf,
  Image,
} from '@react-pdf/renderer';

import { Capacitor } from '@capacitor/core';
import { Browser } from '@capacitor/browser';
import { Directory, Filesystem } from '@capacitor/filesystem';
import { FileOpener } from '@capacitor-community/file-opener';

import fluxLogo from '@/assets/flux-logo.png';

// Register fonts for better typography
Font.register({
  family: 'Inter',
  fonts: [
    { src: 'https://fonts.gstatic.com/s/inter/v13/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2boKoduKmMEVuLyfAZ9hjp-Ek-_EeA.woff', fontWeight: 400 },
    { src: 'https://fonts.gstatic.com/s/inter/v13/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2boKoduKmMEVuLyfAZ9hjp-Ek-_EeA.woff', fontWeight: 400, fontStyle: 'italic' },
    { src: 'https://fonts.gstatic.com/s/inter/v13/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2boKoduKmMEVuI6fAZ9hjp-Ek-_EeA.woff', fontWeight: 600 },
    { src: 'https://fonts.gstatic.com/s/inter/v13/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2boKoduKmMEVuFuYAZ9hjp-Ek-_EeA.woff', fontWeight: 700 },
  ],
});

// NOTE: Avoid external custom font families here.
// Some font URLs (e.g., woff2) may 404 or be unsupported at runtime, crashing PDF generation.

const styles = StyleSheet.create({
  page: {
    fontFamily: 'Inter',
    fontSize: 10,
    paddingTop: 60,
    paddingBottom: 60,
    paddingHorizontal: 40,
    backgroundColor: '#FFFFFF',
  },
  header: {
    position: 'absolute',
    top: 20,
    left: 40,
    right: 40,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 10,
    borderBottomWidth: 2,
    borderBottomColor: '#3B82F6',
  },
  logo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  logoImage: {
    width: 40,
    height: 40,
    objectFit: 'contain',
  },
  logoText: {
    fontFamily: 'Inter',
    fontSize: 20,
    fontWeight: 700,
    color: '#3B82F6',
    letterSpacing: 2,
  },
  headerRight: {
    alignItems: 'flex-end',
  },
  headerTitle: {
    fontSize: 12,
    fontWeight: 600,
    color: '#1F2937',
  },
  headerSubtitle: {
    fontSize: 9,
    color: '#6B7280',
    marginTop: 2,
  },
  title: {
    fontSize: 18,
    fontWeight: 700,
    color: '#1F2937',
    marginTop: 30,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 11,
    color: '#6B7280',
    marginBottom: 20,
  },
  infoSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
    padding: 16,
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
  },
  infoColumn: {
    flex: 1,
  },
  infoLabel: {
    fontSize: 9,
    color: '#6B7280',
    marginBottom: 2,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  infoValue: {
    fontSize: 11,
    fontWeight: 600,
    color: '#1F2937',
  },
  table: {
    marginTop: 10,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#3B82F6',
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderTopLeftRadius: 6,
    borderTopRightRadius: 6,
  },
  tableHeaderCell: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: 600,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  tableRowAlt: {
    backgroundColor: '#F9FAFB',
  },
  tableCell: {
    fontSize: 9,
    color: '#374151',
  },
  tableCellBold: {
    fontSize: 9,
    fontWeight: 600,
    color: '#1F2937',
  },
  colDate: { width: '15%' },
  colId: { width: '15%' },
  colAddress: { width: '50%' },
  colValue: { width: '20%', textAlign: 'right' },
  totalSection: {
    marginTop: 20,
    paddingTop: 16,
    paddingBottom: 16,
    paddingHorizontal: 16,
    backgroundColor: '#EFF6FF',
    borderRadius: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  totalLabel: {
    fontSize: 12,
    fontWeight: 600,
    color: '#1F2937',
  },
  totalValue: {
    fontSize: 18,
    fontWeight: 700,
    color: '#3B82F6',
  },
  footer: {
    position: 'absolute',
    bottom: 20,
    left: 40,
    right: 40,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  footerText: {
    fontSize: 8,
    color: '#9CA3AF',
  },
  pageNumber: {
    fontSize: 8,
    color: '#6B7280',
  },
  savingsBox: {
    marginTop: 12,
    padding: 12,
    backgroundColor: '#ECFDF5',
    borderRadius: 6,
    borderLeftWidth: 4,
    borderLeftColor: '#10B981',
  },
  savingsText: {
    fontSize: 9,
    color: '#047857',
  },
  savingsTextBrand: {
    fontFamily: 'Inter',
    fontSize: 9,
    fontWeight: 700,
    color: '#047857',
    letterSpacing: 1,
  },
  savingsValue: {
    fontSize: 11,
    fontWeight: 700,
    color: '#047857',
    marginTop: 2,
  },
  footerBrand: {
    fontFamily: 'Inter',
    fontSize: 9,
    fontWeight: 700,
    color: '#3B82F6',
    letterSpacing: 1,
    marginTop: 4,
  },
});

const blobToBase64 = (blob: Blob): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Falha ao ler PDF'));
    reader.onloadend = () => {
      const result = reader.result;
      if (typeof result !== 'string') {
        reject(new Error('Falha ao converter PDF'));
        return;
      }
      const commaIndex = result.indexOf(',');
      resolve(commaIndex >= 0 ? result.slice(commaIndex + 1) : result);
    };
    reader.readAsDataURL(blob);
  });

const downloadOrOpenPdf = async (blob: Blob, filename: string) => {
  // Web: open in a new tab (browser PDF viewer). If blocked, fallback to download.
  if (!Capacitor.isNativePlatform()) {
    const url = URL.createObjectURL(blob);
    const opened = window.open(url, '_blank', 'noopener,noreferrer');

    if (!opened) {
      const link = document.createElement('a');
      link.href = url;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }

    // If popups are blocked or the browser doesn't support PDF viewing, offer download.
    if (!opened) {
      const downloadLink = document.createElement('a');
      downloadLink.href = url;
      downloadLink.download = `${filename}.pdf`;
      document.body.appendChild(downloadLink);
      downloadLink.click();
      document.body.removeChild(downloadLink);
    }

    // Give the browser time to load the blob URL before revoking.
    window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
    return;
  }

  // Native (Android/iOS): write to cache and open with system viewer/chooser
  const base64Data = await blobToBase64(blob);
  const pdfPath = `${filename}.pdf`;

  await Filesystem.writeFile({
    path: pdfPath,
    data: base64Data,
    directory: Directory.Cache,
  });

  const { uri } = await Filesystem.getUri({
    path: pdfPath,
    directory: Directory.Cache,
  });

  // Prefer opening in the default browser (Custom Tabs). This may fail for large
  // PDFs (URL length) or when the browser blocks non-http(s) schemes.
  try {
    await Browser.open({
      url: `data:application/pdf;base64,${base64Data}`,
    });
    return;
  } catch {
    // continue
  }

  // Fallback: try to open the file URI in the browser.
  try {
    await Browser.open({ url: uri });
    return;
  } catch {
    // continue
  }

  await FileOpener.open({
    filePath: uri,
    contentType: 'application/pdf',
    openWithDefault: true,
  });
};

export interface ReportPDFData {
  companyName: string;
  driverName: string;
  period: string;
  generatedAt: string;
  reportStatus?: 'open' | 'closed';
  orders: Array<{
    id: string;
    date: string;
    dropoffAddress: string;
    value: number;
  }>;
  totalValue: number;
  isCompanyReport?: boolean;
}

const formatCurrency = (value: number): string => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
};

const ReportPDFDocument = ({ data }: { data: ReportPDFData }) => {
  const estimatedSavings = data.totalValue * 0.25;
  const reportStatusLabel =
    data.reportStatus === 'open'
      ? 'Relatório em andamento'
      : data.reportStatus === 'closed'
        ? 'Relatório fechado'
        : null;
  
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header} fixed>
          <View style={styles.logo}>
            <Image 
              src={fluxLogo}
              style={styles.logoImage}
            />
            <Text style={styles.logoText}>FLUX</Text>
          </View>
          <View style={styles.headerRight}>
            <Text style={styles.headerTitle}>Demonstrativo de Serviços</Text>
            <Text style={styles.headerSubtitle}>Gerado em {data.generatedAt}</Text>
          </View>
        </View>

        {/* Title */}
        <Text style={styles.title}>Relatório de Entregas</Text>
        <Text style={styles.subtitle}>
          {data.isCompanyReport 
            ? `Entregas realizadas por ${data.driverName}`
            : `Entregas realizadas para ${data.companyName}`}
        </Text>

        {reportStatusLabel && (
          <Text style={[styles.subtitle, { marginBottom: 6 }]}>
            {reportStatusLabel}
          </Text>
        )}

        {/* Info Section */}
        <View style={styles.infoSection}>
          <View style={styles.infoColumn}>
            <Text style={styles.infoLabel}>
              {data.isCompanyReport ? 'Entregador' : 'Empresa'}
            </Text>
            <Text style={styles.infoValue}>
              {data.isCompanyReport ? data.driverName : data.companyName}
            </Text>
          </View>
          <View style={styles.infoColumn}>
            <Text style={styles.infoLabel}>Período</Text>
            <Text style={styles.infoValue}>{data.period}</Text>
          </View>
          <View style={styles.infoColumn}>
            <Text style={styles.infoLabel}>Total de Entregas</Text>
            <Text style={styles.infoValue}>{data.orders.length}</Text>
          </View>
          <View style={styles.infoColumn}>
            <Text style={styles.infoLabel}>
              {data.isCompanyReport ? 'Responsável' : 'Emitido por'}
            </Text>
            <Text style={styles.infoValue}>
              {data.isCompanyReport ? data.companyName : data.driverName}
            </Text>
          </View>
        </View>

        {/* Table */}
        <View style={styles.table}>
          {/* Table Header */}
          <View style={styles.tableHeader}>
            <Text style={[styles.tableHeaderCell, styles.colDate]}>Data</Text>
            <Text style={[styles.tableHeaderCell, styles.colId]}>ID</Text>
            <Text style={[styles.tableHeaderCell, styles.colAddress]}>Endereço de Entrega</Text>
            <Text style={[styles.tableHeaderCell, styles.colValue]}>Valor</Text>
          </View>

          {/* Table Rows */}
          {data.orders.map((order, index) => (
            <View 
              key={order.id} 
              style={[
                styles.tableRow, 
                index % 2 === 1 && styles.tableRowAlt
              ]}
            >
              <Text style={[styles.tableCell, styles.colDate]}>{order.date}</Text>
              <Text style={[styles.tableCellBold, styles.colId]}>
                {order.id.slice(0, 8).toUpperCase()}
              </Text>
              <Text style={[styles.tableCell, styles.colAddress]}>
                {order.dropoffAddress.length > 60 
                  ? order.dropoffAddress.slice(0, 60) + '...'
                  : order.dropoffAddress}
              </Text>
              <Text style={[styles.tableCellBold, styles.colValue]}>
                {formatCurrency(order.value)}
              </Text>
            </View>
          ))}
        </View>

        {/* Total */}
        <View style={styles.totalSection}>
          <Text style={styles.totalLabel}>Valor Total</Text>
          <Text style={styles.totalValue}>{formatCurrency(data.totalValue)}</Text>
        </View>

        {/* Savings info for company reports */}
        {data.isCompanyReport && (
          <View style={styles.savingsBox}>
            <View style={{ flexDirection: 'row', alignItems: 'baseline' }}>
              <Text style={styles.savingsText}>
                Economia estimada com{' '}
              </Text>
              <Text style={styles.savingsTextBrand}>FLUX</Text>
              <Text style={styles.savingsText}> (sem taxas de intermediação):</Text>
            </View>
            <Text style={styles.savingsValue}>
              {formatCurrency(estimatedSavings)} (25%)
            </Text>
          </View>
        )}

        {/* Footer */}
        <View style={styles.footer} fixed>
          <Text style={styles.footerText}>
            Este documento é um demonstrativo de serviços prestados.
          </Text>
          <View style={{ flexDirection: 'row', alignItems: 'baseline' }}>
            <Text style={styles.footerBrand}>FLUX</Text>
            <Text style={[styles.footerText, { fontSize: 9, marginLeft: 4 }]}> - Gestão de Entregas</Text>
          </View>
          <Text 
            style={styles.pageNumber}
            render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`}
          />
        </View>
      </Page>
    </Document>
  );
};

// Function to generate and download PDF
export const generateReportPDF = async (data: ReportPDFData, filename: string) => {
  const blob = await pdf(<ReportPDFDocument data={data} />).toBlob();
  await downloadOrOpenPdf(blob, filename);
};

// Consolidated report for multiple companies/drivers
export interface ConsolidatedReportData {
  userName: string;
  userRole: 'driver' | 'company';
  period: string;
  generatedAt: string;
  reportStatus?: 'open' | 'closed';
  groups: Array<{
    name: string;
    orders: Array<{
      id: string;
      date: string;
      dropoffAddress: string;
      value: number;
    }>;
    totalValue: number;
  }>;
  grandTotal: number;
}

const ConsolidatedReportDocument = ({ data }: { data: ConsolidatedReportData }) => {
  const isDriver = data.userRole === 'driver';
  const estimatedSavings = data.grandTotal * 0.25;
  const reportStatusLabel =
    data.reportStatus === 'open'
      ? 'Relatório em andamento'
      : data.reportStatus === 'closed'
        ? 'Relatório fechado'
        : null;
  
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header} fixed>
          <View style={styles.logo}>
            <Image 
              src={fluxLogo}
              style={styles.logoImage}
            />
            <Text style={styles.logoText}>FLUX</Text>
          </View>
          <View style={styles.headerRight}>
            <Text style={styles.headerTitle}>Relatório Consolidado</Text>
            <Text style={styles.headerSubtitle}>Gerado em {data.generatedAt}</Text>
          </View>
        </View>

        {/* Title */}
        <Text style={styles.title}>Relatório Consolidado de Entregas</Text>
        <Text style={styles.subtitle}>
          {isDriver ? 'Todas as empresas' : 'Todos os entregadores'} - {data.period}
        </Text>

        {reportStatusLabel && (
          <Text style={[styles.subtitle, { marginBottom: 6 }]}>
            {reportStatusLabel}
          </Text>
        )}

        {/* Info Section */}
        <View style={styles.infoSection}>
          <View style={styles.infoColumn}>
            <Text style={styles.infoLabel}>{isDriver ? 'Entregador' : 'Empresa'}</Text>
            <Text style={styles.infoValue}>{data.userName}</Text>
          </View>
          <View style={styles.infoColumn}>
            <Text style={styles.infoLabel}>Período</Text>
            <Text style={styles.infoValue}>{data.period}</Text>
          </View>
          <View style={styles.infoColumn}>
            <Text style={styles.infoLabel}>{isDriver ? 'Empresas' : 'Entregadores'}</Text>
            <Text style={styles.infoValue}>{data.groups.length}</Text>
          </View>
          <View style={styles.infoColumn}>
            <Text style={styles.infoLabel}>Total Geral</Text>
            <Text style={styles.infoValue}>{formatCurrency(data.grandTotal)}</Text>
          </View>
        </View>

        {/* Groups */}
        {data.groups.map((group, groupIndex) => (
          <View key={groupIndex} style={{ marginBottom: 20 }} wrap={false}>
            <Text style={{
              fontSize: 12,
              fontWeight: 700,
              color: '#1F2937',
              marginBottom: 8,
              paddingBottom: 4,
              borderBottomWidth: 1,
              borderBottomColor: '#E5E7EB',
            }}>
              {group.name}
            </Text>
            
            {/* Mini Table */}
            <View style={styles.table}>
              <View style={[styles.tableHeader, { backgroundColor: '#6B7280' }]}>
                <Text style={[styles.tableHeaderCell, styles.colDate]}>Data</Text>
                <Text style={[styles.tableHeaderCell, styles.colId]}>ID</Text>
                <Text style={[styles.tableHeaderCell, styles.colAddress]}>Endereço</Text>
                <Text style={[styles.tableHeaderCell, styles.colValue]}>Valor</Text>
              </View>
              
              {group.orders.slice(0, 10).map((order, index) => (
                <View 
                  key={order.id} 
                  style={[styles.tableRow, index % 2 === 1 && styles.tableRowAlt]}
                >
                  <Text style={[styles.tableCell, styles.colDate]}>{order.date}</Text>
                  <Text style={[styles.tableCellBold, styles.colId]}>
                    {order.id.slice(0, 8).toUpperCase()}
                  </Text>
                  <Text style={[styles.tableCell, styles.colAddress]}>
                    {order.dropoffAddress.length > 50 
                      ? order.dropoffAddress.slice(0, 50) + '...'
                      : order.dropoffAddress}
                  </Text>
                  <Text style={[styles.tableCellBold, styles.colValue]}>
                    {formatCurrency(order.value)}
                  </Text>
                </View>
              ))}
              
              {group.orders.length > 10 && (
                <View style={styles.tableRow}>
                  <Text style={[styles.tableCell, { color: '#6B7280' }]}>
                    ... e mais {group.orders.length - 10} entrega(s)
                  </Text>
                </View>
              )}
            </View>
            
            {/* Subtotal */}
            <View style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              paddingVertical: 8,
              paddingHorizontal: 8,
              backgroundColor: '#F3F4F6',
              borderBottomLeftRadius: 6,
              borderBottomRightRadius: 6,
            }}>
              <Text style={{ fontSize: 10, fontWeight: 600, color: '#374151' }}>
                Subtotal ({group.orders.length} entrega{group.orders.length !== 1 ? 's' : ''})
              </Text>
              <Text style={{ fontSize: 10, fontWeight: 700, color: '#1F2937' }}>
                {formatCurrency(group.totalValue)}
              </Text>
            </View>
          </View>
        ))}

        {/* Grand Total */}
        <View style={styles.totalSection}>
          <Text style={styles.totalLabel}>Total Geral</Text>
          <Text style={styles.totalValue}>{formatCurrency(data.grandTotal)}</Text>
        </View>

        {/* Savings info for company reports */}
        {!isDriver && (
          <View style={styles.savingsBox}>
            <View style={{ flexDirection: 'row', alignItems: 'baseline' }}>
              <Text style={styles.savingsText}>
                Economia estimada com{' '}
              </Text>
              <Text style={styles.savingsTextBrand}>FLUX</Text>
              <Text style={styles.savingsText}> (sem taxas de intermediação):</Text>
            </View>
            <Text style={styles.savingsValue}>
              {formatCurrency(estimatedSavings)} (25%)
            </Text>
          </View>
        )}

        {/* Footer */}
        <View style={styles.footer} fixed>
          <Text style={styles.footerText}>
            Este documento é um demonstrativo consolidado de serviços prestados.
          </Text>
          <View style={{ flexDirection: 'row', alignItems: 'baseline' }}>
            <Text style={styles.footerBrand}>FLUX</Text>
            <Text style={[styles.footerText, { fontSize: 9, marginLeft: 4 }]}> - Gestão de Entregas</Text>
          </View>
          <Text 
            style={styles.pageNumber}
            render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`}
          />
        </View>
      </Page>
    </Document>
  );
};

// Function to generate and download consolidated PDF
export const generateConsolidatedReportPDF = async (data: ConsolidatedReportData, filename: string) => {
  const blob = await pdf(<ConsolidatedReportDocument data={data} />).toBlob();
  await downloadOrOpenPdf(blob, filename);
};

export default ReportPDFDocument;
