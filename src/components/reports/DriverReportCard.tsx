import { useState } from 'react';
import { User, FileText, FileSpreadsheet, ChevronDown, ChevronUp, Loader2, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { exportToExcel, formatDate, formatCurrency, getMonthName } from '@/lib/reportExport';
import { generateReportPDF } from './ReportPDF';
import { useAuth } from '@/contexts/AuthContext';
import { getPaymentMonth } from '@/hooks/useReports';
import { toast } from 'sonner';
import type { DriverReportGroup } from '@/hooks/useReports';

interface DriverReportCardProps {
  report: DriverReportGroup;
  selectedMonth: string;
  companyName: string;
}

export const DriverReportCard = ({ report, selectedMonth, companyName }: DriverReportCardProps) => {
  const { user } = useAuth();
  const [showOrders, setShowOrders] = useState(false);
  const [isExportingPDF, setIsExportingPDF] = useState(false);
  
  const getOrdersData = () => report.orders.map(order => ({
    id: order.id,
    date: formatDate(order.completed_at || order.created_at),
    dropoffAddress: order.order_deliveries?.[0]?.dropoff_address || 'N/A',
    value: Number(order.total_value),
  }));
  
  const handleExportExcel = () => {
    exportToExcel({
      companyName,
      driverName: report.driverName,
      period: getMonthName(selectedMonth),
      orders: getOrdersData(),
      totalValue: report.totalValue,
    }, `relatorio_${report.driverName.replace(/\s+/g, '_')}_${selectedMonth}`);
    
    toast.success('Relatório Excel exportado com sucesso!');
  };
  
  const handleExportPDF = async () => {
    setIsExportingPDF(true);
    try {
      await generateReportPDF({
        companyName,
        driverName: report.driverName,
        period: getMonthName(selectedMonth),
        generatedAt: new Date().toLocaleDateString('pt-BR'),
        reportStatus: selectedMonth === getPaymentMonth() ? 'open' : 'closed',
        orders: getOrdersData(),
        totalValue: report.totalValue,
        isCompanyReport: true,
      }, `relatorio_${report.driverName.replace(/\s+/g, '_')}_${selectedMonth}`);
      toast.success('Relatório PDF exportado com sucesso!');
    } catch (error) {
      console.error('Erro ao gerar PDF:', error);
      toast.error('Erro ao gerar PDF. Tente novamente.');
    } finally {
      setIsExportingPDF(false);
    }
  };
  
  return (
    <div className="card-static w-full max-w-full overflow-x-hidden" style={{ maxWidth: '100%' }}>
      <div className="p-3 sm:p-4 w-full max-w-full overflow-x-hidden" style={{ maxWidth: '100%' }}>
        {/* Header: Icon + Info + Value */}
        <div className="flex flex-col sm:flex-row gap-3 mb-3">
          {/* Icon */}
          <div className="p-2 sm:p-2.5 rounded-xl bg-secondary shrink-0">
            <User className="h-4 w-4 sm:h-5 sm:w-5 text-foreground" />
          </div>
          
          {/* Info section */}
          <div className="min-w-0 flex-1">
            {/* Driver name */}
            <h3 className="font-semibold text-foreground text-sm sm:text-base break-words">
              {report.driverName}
            </h3>
            {/* Order count */}
            <p className="text-xs sm:text-sm text-muted-foreground">
              {report.orderCount} entrega(s) realizada(s)
            </p>
          </div>
          
          {/* Value section - visible on mobile */}
          <div className="text-left sm:hidden flex-shrink-0">
            <p className="text-lg font-bold text-foreground">
              {formatCurrency(report.totalValue)}
            </p>
            <p className="text-xs text-muted-foreground">Total pago</p>
          </div>
        </div>
        
        {/* Value section - hidden on mobile */}
        <div className="mb-3 hidden sm:block">
          <div className="text-left">
            <p className="text-lg sm:text-xl font-bold text-foreground">
              {formatCurrency(report.totalValue)}
            </p>
            <p className="text-xs text-muted-foreground">Total pago</p>
          </div>
        </div>
        
        {/* Action buttons */}
        <div className="flex flex-col gap-2 mt-3 sm:mt-4">
          <Button
            size="sm"
            onClick={handleExportPDF}
            disabled={isExportingPDF}
            className="w-full text-xs sm:text-sm bg-blue-600 hover:bg-blue-700 px-2 py-1"
          >
            {isExportingPDF ? (
              <Loader2 className="h-3 w-3 sm:h-4 sm:w-4 animate-spin" />
            ) : (
              <FileText className="h-3 w-3 sm:h-4 sm:w-4" />
            )}
            <span className="hidden xs:inline">PDF</span>
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportExcel}
            className="w-full text-xs sm:text-sm px-2 py-1"
          >
            <FileSpreadsheet className="h-3 w-3 sm:h-4 sm:w-4" />
            <span className="hidden xs:inline">Excel</span>
          </Button>
        </div>
        
        {/* Expand/collapse orders */}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setShowOrders(!showOrders)}
          className="w-full mt-3 text-xs sm:text-sm px-2 py-1"
        >
          {showOrders ? (
            <>
              <ChevronUp className="h-4 w-4" />
              <span className="hidden xs:inline">Ocultar</span> entregas
            </>
          ) : (
            <>
              <ChevronDown className="h-4 w-4" />
              <span className="hidden xs:inline">Ver</span> {report.orderCount}
            </>
          )}
        </Button>
      </div>
      
      {/* Orders list */}
      {showOrders && (
        <div className="border-t border-border">
          <div className="divide-y divide-border max-h-[300px] overflow-y-auto">
            {report.orders.map(order => (
              <div key={order.id} className="p-2 sm:p-3 hover:bg-secondary/50">
                <div className="flex flex-col gap-1">
                  <p className="text-xs text-muted-foreground">
                    {formatDate(order.completed_at || order.created_at)}
                  </p>
                  <p className="text-xs sm:text-sm text-foreground break-words line-clamp-2">
                    {order.order_deliveries?.[0]?.dropoff_address || 'Endereço não disponível'}
                  </p>
                  <p className="text-xs sm:text-sm font-medium text-foreground">
                    {formatCurrency(Number(order.total_value))}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
