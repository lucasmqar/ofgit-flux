import { useState, useMemo } from 'react';
import { AppLayout } from '@/components/AppLayout';
import { useAuth } from '@/contexts/AuthContext';
import { FileText, History, Download, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ReportSummaryCards } from '@/components/reports/ReportSummaryCards';
import { MonthSelector } from '@/components/reports/MonthSelector';
import { ReportStatusTabs } from '@/components/reports/ReportStatusTabs';
import { CompanyReportCard } from '@/components/reports/CompanyReportCard';
import { DriverReportCard } from '@/components/reports/DriverReportCard';
import { PaymentHistoryList } from '@/components/reports/PaymentHistoryList';
import { generateConsolidatedReportPDF } from '@/components/reports/ReportPDF';
import { 
  useDriverReportByCompany, 
  useCompanyReportByDriver,
  useReportSummary,
  getPaymentMonth,
  type ReportStatus,
} from '@/hooks/useReports';
import { exportConsolidatedToExcel, formatDate, getMonthName } from '@/lib/reportExport';
import { toast } from 'sonner';
import { useCompanyProfile } from '@/hooks/useCompanyProfiles';

const Relatorios = () => {
  const { user } = useAuth();
  const [selectedMonth, setSelectedMonth] = useState(getPaymentMonth());
  const [statusFilter, setStatusFilter] = useState<ReportStatus | 'all'>('all');
  const [mainTab, setMainTab] = useState<'reports' | 'history'>('reports');
  const [isExportingPDF, setIsExportingPDF] = useState(false);
  
  const isDriver = user?.role === 'driver';
  const isCompany = user?.role === 'company';
  
  // Hooks
  const { data: driverReports, isLoading: driverLoading } = useDriverReportByCompany(selectedMonth);
  const { data: companyReports, isLoading: companyLoading } = useCompanyReportByDriver(selectedMonth);
  const { data: summary, isLoading: summaryLoading } = useReportSummary();
  const { data: companyProfile } = useCompanyProfile(user?.id);
  
  const reports = isDriver ? driverReports : companyReports;
  const isLoading = isDriver ? driverLoading : companyLoading;
  
  // Filter reports by status
  const filteredReports = useMemo(() => {
    if (!reports) return [];
    if (statusFilter === 'all') return reports;
    return reports.filter((r: any) => r.status === statusFilter);
  }, [reports, statusFilter]);
  
  // Calculate status counts
  const statusCounts = useMemo(() => {
    if (!driverReports) {
      return { all: 0, in_progress: 0, pending: 0, overdue: 0, paid: 0 };
    }
    return {
      all: driverReports.length,
      in_progress: driverReports.filter(r => r.status === 'in_progress').length,
      pending: driverReports.filter(r => r.status === 'pending').length,
      overdue: driverReports.filter(r => r.status === 'overdue').length,
      paid: driverReports.filter(r => r.status === 'paid').length,
    };
  }, [driverReports]);
  
  // Get formatted report groups
  const getReportGroups = () => {
    if (!reports) return [];
    return reports.map((r: any) => ({
      name: isDriver ? r.companyName : r.driverName,
      orders: r.orders.map((order: any) => ({
        id: order.id,
        date: formatDate(order.completed_at || order.created_at),
        dropoffAddress: order.order_deliveries?.[0]?.dropoff_address || 'N/A',
        value: Number(order.total_value),
      })),
      totalValue: r.totalValue,
    }));
  };
  
  // Export all reports as Excel
  const handleExportAllExcel = () => {
    const groups = getReportGroups();
    if (groups.length === 0) {
      toast.error('Nenhum relatório para exportar');
      return;
    }
    
    exportConsolidatedToExcel(
      user?.name || 'Usuário',
      getMonthName(selectedMonth),
      groups,
      `relatorio_consolidado_${selectedMonth}`
    );
    
    toast.success('Relatório Excel consolidado exportado!');
  };
  
  // Export all reports as PDF
  const handleExportAllPDF = async () => {
    const groups = getReportGroups();
    if (groups.length === 0) {
      toast.error('Nenhum relatório para exportar');
      return;
    }
    
    setIsExportingPDF(true);
    try {
      const grandTotal = groups.reduce((sum, g) => sum + g.totalValue, 0);
      
      const pdfData = {
        userName: user?.name || 'Usuário',
        userRole: isDriver ? 'driver' as const : 'company' as const,
        period: getMonthName(selectedMonth),
        generatedAt: new Date().toLocaleDateString('pt-BR'),
        reportStatus: selectedMonth === getPaymentMonth() ? 'open' as const : 'closed' as const,
        groups,
        grandTotal,
      };
      
      console.log('PDF Data:', pdfData);
      
      await generateConsolidatedReportPDF(pdfData, `relatorio_consolidado_${selectedMonth}`);
      
      toast.success('Relatório PDF consolidado exportado!');
    } catch (error) {
      console.error('Erro ao gerar PDF:', error);
      toast.error('Erro ao gerar PDF. Tente novamente.');
    } finally {
      setIsExportingPDF(false);
    }
  };
  
  if (!user) return null;
  
  return (
    <AppLayout>
      <div className="space-y-3 sm:space-y-4 pb-8 w-full max-w-full overflow-x-hidden">
        {/* Header */}
        <div className="flex items-center gap-2">
          <div className="p-1.5 sm:p-2.5 rounded-xl bg-primary/10 shrink-0">
            <FileText className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
          </div>
          <div className="min-w-0 flex-1">
            <h1 className="text-lg sm:text-xl font-bold text-foreground truncate">Relatórios</h1>
            <p className="text-xs text-muted-foreground truncate">
              {isDriver ? 'Recebimentos por empresa' : 'Entregas por entregador'}
            </p>
          </div>
        </div>
        
        {/* Main Tabs */}
        <Tabs value={mainTab} onValueChange={(v) => setMainTab(v as 'reports' | 'history')} className="w-full max-w-full overflow-x-hidden">
          <TabsList className="grid w-full max-w-md grid-cols-2 text-xs sm:text-sm">
            <TabsTrigger value="reports" className="flex items-center gap-1 sm:gap-2 px-2">
              <FileText className="h-4 w-4" />
              <span>Relatórios</span>
            </TabsTrigger>
            <TabsTrigger value="history" className="flex items-center gap-1 sm:gap-2 px-2">
              <History className="h-4 w-4" />
              <span>Histórico</span>
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="reports" className="space-y-3 sm:space-y-4 mt-3 sm:mt-4 w-full max-w-full overflow-x-hidden">
            {/* Summary Cards */}
            <ReportSummaryCards 
              summary={summary || { pendingValue: 0, paidValue: 0, totalValue: 0, pendingCount: 0, paidCount: 0, totalCount: 0 }}
              role={isDriver ? 'driver' : 'company'}
              isLoading={summaryLoading}
            />
            
            {/* Month Selector */}
            <MonthSelector 
              selectedMonth={selectedMonth}
              onMonthChange={setSelectedMonth}
            />
            
            {/* Status Filter Tabs (only for drivers) */}
            {isDriver && (
              <ReportStatusTabs
                activeTab={statusFilter}
                onTabChange={setStatusFilter}
                counts={statusCounts}
              />
            )}
            
            {/* Export All Buttons */}
            {reports && reports.length > 0 && (
              <div className="flex flex-col gap-2 w-full">
                {selectedMonth === getPaymentMonth() && (
                  <div className="flex items-start gap-2 text-xs text-muted-foreground">
                    <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse shrink-0 mt-1" />
                    <span className="break-words leading-tight">Relatório em andamento - pode ser atualizado até o fim do mês</span>
                  </div>
                )}
                <div className="flex flex-col gap-2 w-full">
                  <Button 
                    variant="outline" 
                    onClick={handleExportAllPDF}
                    disabled={isExportingPDF}
                    className="text-xs w-full h-9"
                  >
                    {isExportingPDF ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <FileText className="h-4 w-4" />
                    )}
                    <span className="hidden xs:inline">{selectedMonth === getPaymentMonth() ? 'Exportar PDF (Parcial)' : 'Exportar PDF'}</span>
                    <span className="xs:hidden">PDF</span>
                  </Button>
                  <Button variant="outline" onClick={handleExportAllExcel} className="text-xs w-full h-9">
                    <Download className="h-4 w-4" />
                    <span className="hidden xs:inline">{selectedMonth === getPaymentMonth() ? 'Exportar Excel (Parcial)' : 'Exportar Excel'}</span>
                    <span className="xs:hidden">Excel</span>
                  </Button>
                </div>
              </div>
            )}
            
            {/* Report Cards */}
            <div className="space-y-3 w-full">
              {isLoading ? (
                <div className="space-y-3 sm:space-y-4">
                  {[1, 2, 3].map(i => (
                    <div key={i} className="card-static p-3 sm:p-6 animate-pulse">
                      <div className="h-5 sm:h-6 bg-muted rounded w-1/3 mb-3 sm:mb-4" />
                      <div className="h-3 sm:h-4 bg-muted rounded w-1/4" />
                    </div>
                  ))}
                </div>
              ) : filteredReports.length === 0 ? (
                <div className="card-static p-6 sm:p-8 text-center">
                  <FileText className="h-8 sm:h-12 w-8 sm:w-12 text-muted-foreground mx-auto mb-2 sm:mb-3" />
                  <p className="text-xs sm:text-sm text-muted-foreground">
                    {statusFilter === 'all'
                      ? 'Nenhum relatório encontrado para este período.'
                      : `Nenhum relatório com status "${statusFilter}" encontrado.`}
                  </p>
                </div>
              ) : (
                <>
                  {isDriver ? (
                    filteredReports.map((report: any) => (
                      <CompanyReportCard
                        key={report.companyUserId}
                        report={report}
                        selectedMonth={selectedMonth}
                      />
                    ))
                  ) : (
                    filteredReports.map((report: any) => (
                      <DriverReportCard
                        key={report.driverUserId}
                        report={report}
                        selectedMonth={selectedMonth}
                        companyName={companyProfile?.company_name || 'Empresa'}
                      />
                    ))
                  )}
                </>
              )}
            </div>
          </TabsContent>
          
          <TabsContent value="history" className="space-y-3 sm:space-y-4 mt-3 sm:mt-4 w-full max-w-full overflow-x-hidden">
            <div className="mb-3">
              <h2 className="text-lg font-semibold text-foreground">Histórico de Pagamentos</h2>
              <p className="text-sm text-muted-foreground">
                {isDriver 
                  ? 'Registro de todos os pagamentos recebidos'
                  : 'Registro de pagamentos confirmados pelos entregadores'}
              </p>
            </div>
            <PaymentHistoryList />
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
};

export default Relatorios;
