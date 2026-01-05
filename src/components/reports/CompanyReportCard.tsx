import { useState } from 'react';
import { Building2, FileText, FileSpreadsheet, Check, Loader2, ChevronDown, ChevronUp, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { StatusIndicator } from './StatusIndicator';
import { useMarkCompanyAsPaid } from '@/hooks/useReports';
import { exportToExcel, formatDate, formatCurrency, getMonthName } from '@/lib/reportExport';
import { generateReportPDF } from './ReportPDF';
import { getPaymentMonth } from '@/hooks/useReports';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import type { CompanyReportGroup } from '@/hooks/useReports';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface CompanyReportCardProps {
  report: CompanyReportGroup;
  selectedMonth: string;
}

export const CompanyReportCard = ({ report, selectedMonth }: CompanyReportCardProps) => {
  const { user } = useAuth();
  const [showOrders, setShowOrders] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [isExportingPDF, setIsExportingPDF] = useState(false);
  const markAsPaid = useMarkCompanyAsPaid();
  
  const getOrdersData = () => report.orders.map(order => ({
    id: order.id,
    date: formatDate(order.completed_at || order.created_at),
    dropoffAddress: order.order_deliveries?.[0]?.dropoff_address || 'N/A',
    value: Number(order.total_value),
  }));
  
  const handleExportExcel = () => {
    exportToExcel({
      companyName: report.companyName,
      driverName: user?.name || 'Entregador',
      period: getMonthName(selectedMonth),
      orders: getOrdersData(),
      totalValue: report.totalValue,
    }, `relatorio_${report.companyName.replace(/\s+/g, '_')}_${selectedMonth}`);
    
    toast.success('Relatório Excel exportado com sucesso!');
  };
  
  const handleExportPDF = async () => {
    setIsExportingPDF(true);
    try {
      await generateReportPDF({
        companyName: report.companyName,
        driverName: user?.name || 'Entregador',
        period: getMonthName(selectedMonth),
        generatedAt: new Date().toLocaleDateString('pt-BR'),
        reportStatus: selectedMonth === getPaymentMonth() ? 'open' : 'closed',
        orders: getOrdersData(),
        totalValue: report.totalValue,
        isCompanyReport: false,
      }, `relatorio_${report.companyName.replace(/\s+/g, '_')}_${selectedMonth}`);
      toast.success('Relatório PDF exportado com sucesso!');
    } catch (error) {
      console.error('Erro ao gerar PDF:', error);
      toast.error('Erro ao gerar PDF. Tente novamente.');
    } finally {
      setIsExportingPDF(false);
    }
  };
  
  const handleMarkAsPaid = async () => {
    try {
      await markAsPaid.mutateAsync({
        companyUserId: report.companyUserId,
        orders: report.orders,
        paymentMonth: selectedMonth,
      });
      toast.success(`Pagamento de ${report.companyName} registrado com sucesso!`);
      setShowConfirmDialog(false);
    } catch (error: any) {
      toast.error('Erro ao registrar pagamento: ' + error.message);
    }
  };
  
  return (
    <>
      <div className="card-static w-full max-w-full overflow-x-hidden" style={{maxWidth: '100%'}}>
        <div className="p-3 w-full max-w-full overflow-x-hidden" style={{maxWidth: '100%'}}>
          {/* Header: Icon + Info + Value */}
          <div className="flex flex-col sm:flex-row gap-2 mb-3 w-full max-w-full overflow-x-hidden">
            {/* Icon */}
            <div className="p-2 sm:p-2.5 rounded-xl bg-secondary shrink-0">
              <Building2 className="h-4 w-4 sm:h-5 sm:w-5 text-foreground" />
            </div>
            
            {/* Info section */}
            <div className="min-w-0 flex-1 w-full">
              {/* Company name and status */}
              <div className="flex flex-col gap-1 mb-1 w-full">
                <div className="flex flex-wrap items-center gap-1 w-full">
                  <h3 className="font-semibold text-foreground text-sm sm:text-base break-words max-w-full">
                    {report.companyName}
                  </h3>
                  <div className="flex-shrink-0">
                    <StatusIndicator status={report.status} showLabel />
                  </div>
                </div>
              </div>
              
              {/* Order count */}
              <p className="text-xs sm:text-sm text-muted-foreground">
                {report.orderCount} pedido(s) pendente(s)
              </p>
            </div>
          </div>
          
          {/* Value section */}
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 mb-3">
            <div className="text-left">
              <p className="text-lg sm:text-xl font-bold text-foreground">
                {formatCurrency(report.totalValue)}
              </p>
              <p className="text-xs text-muted-foreground">A receber</p>
            </div>
            
            {/* Quick download button on mobile */}
            <Button
              variant="ghost"
              size="sm"
              onClick={handleExportPDF}
              disabled={isExportingPDF}
              className="shrink-0 h-8 w-8 p-0 sm:hidden self-start"
              title="Baixar PDF"
            >
              {isExportingPDF ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Download className="h-4 w-4" />
              )}
            </Button>
          </div>
          
          {/* Action buttons */}
          <div className="flex flex-col gap-2 mt-3 sm:mt-4">
            <Button
              size="sm"
              onClick={() => setShowConfirmDialog(true)}
              disabled={markAsPaid.isPending || report.status === 'paid'}
              className="w-full text-xs sm:text-sm bg-emerald-600 hover:bg-emerald-700 px-2 py-1"
            >
              {markAsPaid.isPending ? (
                <Loader2 className="h-3 w-3 sm:h-4 sm:w-4 animate-spin" />
              ) : (
                <Check className="h-3 w-3 sm:h-4 sm:w-4" />
              )}
              <span className="hidden xs:inline">Marcar Pago</span>
              <span className="xs:hidden">Pago</span>
            </Button>
            <div className="flex flex-col sm:flex-row gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleExportPDF}
                disabled={isExportingPDF}
                className="w-full sm:flex-1 text-xs sm:text-sm px-2 py-1"
              >
                {isExportingPDF ? (
                  <Loader2 className="h-3 w-3 sm:h-4 sm:w-4 animate-spin" />
                ) : (
                  <FileText className="h-3 w-3 sm:h-4 sm:w-4" />
                )}
                PDF
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleExportExcel}
                className="w-full sm:flex-1 text-xs sm:text-sm px-2 py-1"
              >
                <FileSpreadsheet className="h-3 w-3 sm:h-4 sm:w-4" />
                Excel
              </Button>
            </div>
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
                <span className="hidden xs:inline">Ocultar</span> pedidos
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
      
      {/* Confirmation Dialog */}
      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Recebimento</AlertDialogTitle>
            <AlertDialogDescription>
              Você confirma que recebeu o pagamento de <strong>{formatCurrency(report.totalValue)}</strong> referente a{' '}
              <strong>{report.orderCount} pedido(s)</strong> da empresa <strong>{report.companyName}</strong>?
              <br /><br />
              Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleMarkAsPaid}
              className="bg-emerald-600 hover:bg-emerald-700"
            >
              Confirmar Recebimento
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
