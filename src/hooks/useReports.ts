import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export type ReportStatus = 'in_progress' | 'pending' | 'overdue' | 'paid';

export interface CompanyReportGroup {
  companyUserId: string;
  companyName: string;
  totalValue: number;
  orderCount: number;
  orders: any[];
  status: ReportStatus;
  oldestOrderDate: Date | null;
}

export interface DriverReportGroup {
  driverUserId: string;
  driverName: string;
  totalValue: number;
  orderCount: number;
  orders: any[];
}

export interface ReportSummary {
  pendingValue: number;
  paidValue: number;
  totalValue: number;
  pendingCount: number;
  paidCount: number;
  totalCount: number;
  // For companies
  estimatedSavings?: number;
  projectedSpending?: number;
}

// Helper to get payment month string
export const getPaymentMonth = (date: Date = new Date()): string => {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
};

// Helper to get last day of month
export const getLastDayOfMonth = (year: number, month: number): Date => {
  return new Date(year, month + 1, 0, 23, 59, 59);
};

// Helper to calculate report status
const calculateReportStatus = (
  orders: any[],
  paidOrderIds: Set<string>,
  currentMonth: string
): ReportStatus => {
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  
  const unpaidOrders = orders.filter(o => !paidOrderIds.has(o.id));
  
  if (unpaidOrders.length === 0) return 'paid';
  
  // Check if any order is from current month and still in_progress
  const hasInProgressOrders = unpaidOrders.some(o => {
    const orderMonth = getPaymentMonth(new Date(o.completed_at || o.created_at));
    return orderMonth === currentMonth && o.status === 'driver_completed';
  });
  
  if (hasInProgressOrders) return 'in_progress';
  
  // Check if any unpaid order is older than 30 days
  const hasOverdueOrders = unpaidOrders.some(o => {
    const completedAt = new Date(o.completed_at || o.created_at);
    return completedAt < thirtyDaysAgo;
  });
  
  if (hasOverdueOrders) return 'overdue';
  
  return 'pending';
};

// Hook: Get driver's report grouped by company
export const useDriverReportByCompany = (month?: string) => {
  const { user } = useAuth();
  const currentMonth = month || getPaymentMonth();
  
  return useQuery({
    queryKey: ['driver-report-by-company', user?.id, currentMonth],
    queryFn: async () => {
      if (!user?.id) return [];
      
      // Get all completed orders for this driver
      const { data: orders, error: ordersError } = await supabase
        .from('orders')
        .select(`
          *,
          order_deliveries(*)
        `)
        .eq('driver_user_id', user.id)
        .in('status', ['completed', 'driver_completed']);
      
      if (ordersError) throw ordersError;
      
      // Get company names separately since there's no FK relationship
      const companyIds = [...new Set(orders?.map(o => o.company_user_id) || [])];
      const { data: companyProfiles } = await supabase
        .from('company_profiles')
        .select('user_id, company_name')
        .in('user_id', companyIds);
      
      const companyMap = new Map(companyProfiles?.map(c => [c.user_id, c.company_name]) || []);
      
      // Get paid orders
      const { data: paidOrders, error: paidError } = await supabase
        .from('order_payments')
        .select('order_id')
        .eq('driver_user_id', user.id);
      
      if (paidError) throw paidError;
      
      const paidOrderIds = new Set(paidOrders?.map(p => p.order_id) || []);
      
      // Only include orders from the selected month
      const monthOrders = (orders || []).filter(o => {
        const orderMonth = getPaymentMonth(new Date(o.completed_at || o.created_at));
        return orderMonth === currentMonth;
      });

      // Group orders by company
      const groupedByCompany = new Map<string, CompanyReportGroup>();
      
      monthOrders.forEach(order => {
        const companyId = order.company_user_id;
        const companyName = companyMap.get(companyId) || 'Empresa Desconhecida';
        
        if (!groupedByCompany.has(companyId)) {
          groupedByCompany.set(companyId, {
            companyUserId: companyId,
            companyName,
            totalValue: 0,
            orderCount: 0,
            orders: [],
            status: 'pending',
            oldestOrderDate: null,
          });
        }
        
        const group = groupedByCompany.get(companyId)!;
        
        // Only count unpaid orders in totals
        if (!paidOrderIds.has(order.id)) {
          group.totalValue += Number(order.total_value);
          group.orderCount += 1;
          group.orders.push(order);
          
          const orderDate = new Date(order.completed_at || order.created_at);
          if (!group.oldestOrderDate || orderDate < group.oldestOrderDate) {
            group.oldestOrderDate = orderDate;
          }
        }
      });
      
      // Calculate status for each group
      groupedByCompany.forEach((group, companyId) => {
        group.status = calculateReportStatus(group.orders, paidOrderIds, currentMonth);
      });
      
      // Filter out groups with no unpaid orders and convert to array
      return Array.from(groupedByCompany.values()).filter(g => g.orderCount > 0);
    },
    enabled: !!user?.id,
  });
};

// Hook: Get company's report grouped by driver
export const useCompanyReportByDriver = (month?: string) => {
  const { user } = useAuth();
  const currentMonth = month || getPaymentMonth();
  
  return useQuery({
    queryKey: ['company-report-by-driver', user?.id, currentMonth],
    queryFn: async () => {
      if (!user?.id) return [];
      
      // Get all completed orders for this company
      const { data: orders, error: ordersError } = await supabase
        .from('orders')
        .select(`
          *,
          order_deliveries(*)
        `)
        .eq('company_user_id', user.id)
        .in('status', ['completed', 'driver_completed']);
      
      if (ordersError) throw ordersError;
      
      // Only include orders from the selected month
      const monthOrders = (orders || []).filter(o => {
        const orderMonth = getPaymentMonth(new Date(o.completed_at || o.created_at));
        return orderMonth === currentMonth;
      });

      // Get driver names separately
      const driverIds = [...new Set(monthOrders.map(o => o.driver_user_id).filter(Boolean) || [])];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, name')
        .in('id', driverIds);
      
      const driverMap = new Map(profiles?.map(p => [p.id, p.name]) || []);
      
      // Group orders by driver
      const groupedByDriver = new Map<string, DriverReportGroup>();
      
      monthOrders.forEach(order => {
        if (!order.driver_user_id) return;
        
        const driverId = order.driver_user_id;
        const driverName = driverMap.get(driverId) || 'Entregador Desconhecido';
        
        if (!groupedByDriver.has(driverId)) {
          groupedByDriver.set(driverId, {
            driverUserId: driverId,
            driverName,
            totalValue: 0,
            orderCount: 0,
            orders: [],
          });
        }
        
        const group = groupedByDriver.get(driverId)!;
        group.totalValue += Number(order.total_value);
        group.orderCount += 1;
        group.orders.push(order);
      });
      
      return Array.from(groupedByDriver.values());
    },
    enabled: !!user?.id,
  });
};

// Hook: Get report summary
export const useReportSummary = () => {
  const { user } = useAuth();
  
  return useQuery({
    queryKey: ['report-summary', user?.id, user?.role],
    queryFn: async (): Promise<ReportSummary> => {
      if (!user?.id) {
        return {
          pendingValue: 0,
          paidValue: 0,
          totalValue: 0,
          pendingCount: 0,
          paidCount: 0,
          totalCount: 0,
        };
      }
      
      const isDriver = user.role === 'driver';
      const isCompany = user.role === 'company';
      
      // Get completed orders
      let ordersQuery = supabase
        .from('orders')
        .select('id, total_value, status, completed_at')
        .in('status', ['completed', 'driver_completed']);
      
      if (isDriver) {
        ordersQuery = ordersQuery.eq('driver_user_id', user.id);
      } else if (isCompany) {
        ordersQuery = ordersQuery.eq('company_user_id', user.id);
      }
      
      const { data: orders, error: ordersError } = await ordersQuery;
      if (ordersError) throw ordersError;
      
      // Get paid orders (only relevant for drivers)
      let paidOrderIds = new Set<string>();
      let paidThisMonth = 0;
      
      if (isDriver) {
        const currentMonth = getPaymentMonth();
        
        const { data: paidOrders, error: paidError } = await supabase
          .from('order_payments')
          .select('order_id, payment_month')
          .eq('driver_user_id', user.id);
        
        if (paidError) throw paidError;
        
        paidOrders?.forEach(p => {
          paidOrderIds.add(p.order_id);
          if (p.payment_month === currentMonth) {
            const order = orders?.find(o => o.id === p.order_id);
            if (order) {
              paidThisMonth += Number(order.total_value);
            }
          }
        });
      }
      
      const pendingOrders = orders?.filter(o => !paidOrderIds.has(o.id)) || [];
      const paidOrders = orders?.filter(o => paidOrderIds.has(o.id)) || [];
      
      const pendingValue = pendingOrders.reduce((sum, o) => sum + Number(o.total_value), 0);
      const totalValue = (orders || []).reduce((sum, o) => sum + Number(o.total_value), 0);
      
      const summary: ReportSummary = {
        pendingValue,
        paidValue: isDriver ? paidThisMonth : totalValue,
        totalValue,
        pendingCount: pendingOrders.length,
        paidCount: paidOrders.length,
        totalCount: orders?.length || 0,
      };

      // Economia FLUX (25% fixo) - exibida em Relatórios para driver e company
      summary.estimatedSavings = totalValue * 0.25;
      
      // Company-specific projected spending
      if (isCompany) {
        summary.projectedSpending = totalValue;
      }
      
      return summary;
    },
    enabled: !!user?.id,
  });
};

// Hook: Mark orders as paid for a specific company
export const useMarkCompanyAsPaid = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ companyUserId, orders, paymentMonth }: { companyUserId: string; orders: any[]; paymentMonth: string }) => {
      if (!user?.id) throw new Error('User not authenticated');

      const totalValue = orders.reduce((sum, o) => sum + Number(o.total_value), 0);
      
      // Insert payment records for each order
      const paymentRecords = orders.map(order => ({
        order_id: order.id,
        driver_user_id: user.id,
        company_user_id: companyUserId,
        payment_month: paymentMonth,
      }));
      
      const { error: paymentError } = await supabase
        .from('order_payments')
        .insert(paymentRecords);
      
      if (paymentError) throw paymentError;
      
      // Insert payment history record
      const { error: historyError } = await supabase
        .from('payment_history')
        .insert({
          driver_user_id: user.id,
          company_user_id: companyUserId,
          payment_month: paymentMonth,
          total_orders: orders.length,
          total_value: totalValue,
        });
      
      if (historyError) throw historyError;
      
      return { success: true };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['driver-report-by-company'] });
      queryClient.invalidateQueries({ queryKey: ['report-summary'] });
      queryClient.invalidateQueries({ queryKey: ['payment-history'] });
    },
  });
};

// Hook: Get payment history
export const usePaymentHistory = () => {
  const { user } = useAuth();
  
  return useQuery({
    queryKey: ['payment-history', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      
      const isDriver = user.role === 'driver';
      
      // Query payment_history with explicit columns
      let query = supabase
        .from('payment_history')
        .select('id, company_user_id, driver_user_id, payment_month, total_value, total_orders, marked_at')
        .order('marked_at', { ascending: false });
      
      if (isDriver) {
        query = query.eq('driver_user_id', user.id);
      } else {
        query = query.eq('company_user_id', user.id);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      
      // Get company and driver names separately
      if (data && data.length > 0) {
        const companyIds = [...new Set(data.map(d => d.company_user_id))];
        const driverIds = [...new Set(data.map(d => d.driver_user_id))];
        
        const { data: companies } = await supabase
          .from('company_profiles')
          .select('user_id, company_name')
          .in('user_id', companyIds);
        
        const { data: drivers } = await supabase
          .from('profiles')
          .select('id, full_name')
          .in('id', driverIds);
        
        const companyMap = new Map(companies?.map(c => [c.user_id, c.company_name]) || []);
        const driverMap = new Map(drivers?.map(d => [d.id, d.full_name]) || []);
        
        return data.map(item => ({
          ...item,
          order_count: (item as any).total_orders,
          driver_name: driverMap.get(item.driver_user_id) || 'Desconhecido',
          company_name: companyMap.get(item.company_user_id) || 'Desconhecida',
        }));
      }
      
      return data || [];
    },
    enabled: !!user?.id,
  });
};

// Hook: Get all orders for a specific company (for PDF/Excel export)
export const useCompanyOrders = (companyUserId: string, month?: string) => {
  const { user } = useAuth();
  
  return useQuery({
    queryKey: ['company-orders', user?.id, companyUserId, month],
    queryFn: async () => {
      if (!user?.id || !companyUserId) return [];
      
      let query = supabase
        .from('orders')
        .select(`
          *,
          order_deliveries(*)
        `)
        .eq('driver_user_id', user.id)
        .eq('company_user_id', companyUserId)
        .eq('status', 'completed')
        .order('completed_at', { ascending: false });
      
      const { data, error } = await query;
      if (error) throw error;
      
      return data || [];
    },
    enabled: !!user?.id && !!companyUserId,
  });
};
