export type UserRole = 'admin' | 'company' | 'driver';

export type OrderStatus = 'pending' | 'accepted' | 'driver_completed' | 'completed' | 'cancelled';

export type PackageType = 'envelope' | 'bag' | 'small_box' | 'large_box' | 'other';

export type VehicleType = 'moto' | 'car' | 'bike';

export interface User {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: UserRole;
  createdAt: Date;
  isBanned?: boolean;
}

export interface CompanyProfile {
  userId: string;
  companyName: string;
  addressDefault: string;
  cnpj?: string;
}

export interface DriverProfile {
  userId: string;
  vehicleType: VehicleType;
  vehicleModel: string;
  plate: string;
}

export interface Credits {
  userId: string;
  validUntil: Date;
}

export interface OrderDelivery {
  id: string;
  orderId: string;
  pickupAddress: string;
  dropoffAddress: string;
  packageType: PackageType;
  notes?: string;
  suggestedPrice: number;
  createdAt: Date;
}

export interface Order {
  id: string;
  companyUserId: string;
  driverUserId?: string;
  status: OrderStatus;
  totalValue: number;
  deliveries: OrderDelivery[];
  createdAt: Date;
  updatedAt: Date;
  acceptedAt?: Date;
  driverCompletedAt?: Date;
  completedAt?: Date;
  cancelledAt?: Date;
}

export interface Rating {
  id: string;
  orderId: string;
  fromUserId: string;
  toUserId: string;
  stars: number;
  comment?: string;
  createdAt: Date;
}

export type NotificationTag = 'deliveries' | 'credits' | 'account';

export interface Notification {
  id: string;
  userId: string;
  tag: NotificationTag;
  title: string;
  message: string;
  createdAt: Date;
  readAt?: Date;
}

export interface AdminAlert {
  id: string;
  targetUserId: string;
  message: string;
  createdAt: Date;
  active: boolean;
}

export const WHATSAPP_SUPPORT = 'https://wa.me/5564981068393';
export const WHATSAPP_NUMBER = '5564981068393';

export const INSTITUTIONAL_SITE_URL = 'https://iflux.space';

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  pending: 'Aguardando',
  accepted: 'Aceito',
  driver_completed: 'Entregue',
  completed: 'Concluído',
  cancelled: 'Cancelado',
};

export const PACKAGE_TYPE_LABELS: Record<PackageType, string> = {
  envelope: 'Envelope',
  bag: 'Sacola',
  small_box: 'Caixa Pequena',
  large_box: 'Caixa Grande',
  other: 'Outro',
};

export const VEHICLE_TYPE_LABELS: Record<VehicleType, string> = {
  moto: 'Moto',
  car: 'Carro',
  bike: 'Bicicleta',
};

// Utility function for Brasília timezone
export const toBrasiliaDate = (date: Date = new Date()): Date => {
  return new Date(date.toLocaleString('en-US', { timeZone: 'America/Sao_Paulo' }));
};

export const formatBrasiliaDate = (date: Date): string => {
  return new Date(date).toLocaleString('pt-BR', { 
    timeZone: 'America/Sao_Paulo',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

export const formatBrasiliaDateShort = (date: Date): string => {
  return new Date(date).toLocaleString('pt-BR', { 
    timeZone: 'America/Sao_Paulo',
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  });
};
