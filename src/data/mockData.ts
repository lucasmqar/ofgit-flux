import { 
  User, 
  CompanyProfile, 
  DriverProfile, 
  Credits, 
  Order, 
  OrderDelivery, 
  OrderStatus,
  Notification,
  AdminAlert,
  Rating,
  toBrasiliaDate
} from '@/types';

// Mock Users
export const mockUsers: User[] = [
  {
    id: '1',
    name: 'Admin Master',
    email: 'admin@flux.com',
    phone: '64981068393',
    role: 'admin',
    createdAt: new Date('2024-01-01'),
  },
  {
    id: '2',
    name: 'Farmácia Central',
    email: 'empresa@flux.com',
    phone: '64999999999',
    role: 'company',
    createdAt: new Date('2024-06-15'),
  },
  {
    id: '3',
    name: 'Drogaria Popular',
    email: 'contato@drogaria.com',
    phone: '64988887777',
    role: 'company',
    createdAt: new Date('2024-08-20'),
  },
  {
    id: '4',
    name: 'João Silva',
    email: 'joao@entregador.com',
    phone: '64988888888',
    role: 'driver',
    createdAt: new Date('2024-07-10'),
  },
  {
    id: '5',
    name: 'Maria Santos',
    email: 'maria@entregas.com',
    phone: '64977776666',
    role: 'driver',
    createdAt: new Date('2024-09-01'),
  },
];

// Mock Company Profiles
export const mockCompanyProfiles: CompanyProfile[] = [
  {
    userId: '2',
    companyName: 'Farmácia Central',
    addressDefault: 'Av. Goiás, 1500 - Centro',
  },
  {
    userId: '3',
    companyName: 'Drogaria Popular',
    addressDefault: 'Rua das Flores, 200 - Jardim América',
  },
];

// Mock Driver Profiles
export const mockDriverProfiles: DriverProfile[] = [
  {
    userId: '4',
    vehicleType: 'moto',
    vehicleModel: 'Honda CG 160',
    plate: 'ABC-1234',
  },
  {
    userId: '5',
    vehicleType: 'bike',
    vehicleModel: 'Bicicleta Elétrica',
    plate: '',
  },
];

// Mock Credits
export const mockCredits: Credits[] = [
  {
    userId: '1',
    validUntil: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
  },
  {
    userId: '2',
    validUntil: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000),
  },
  {
    userId: '3',
    validUntil: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // Expired
  },
  {
    userId: '4',
    validUntil: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
  },
  {
    userId: '5',
    validUntil: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
  },
];

// Mock Order Deliveries
const mockOrderDeliveries: OrderDelivery[] = [
  // Order 1 deliveries
  {
    id: 'd1',
    orderId: 'o1',
    pickupAddress: 'Av. Goiás, 1500 - Centro',
    dropoffAddress: 'Rua Minas Gerais, 321 - Setor Central',
    packageType: 'bag',
    notes: 'Medicamentos - entregar em mãos',
    suggestedPrice: 9,
    createdAt: new Date(Date.now() - 30 * 60 * 1000),
  },
  {
    id: 'd2',
    orderId: 'o1',
    pickupAddress: 'Av. Goiás, 1500 - Centro',
    dropoffAddress: 'Rua Paraná, 555 - Jardim América',
    packageType: 'envelope',
    suggestedPrice: 6,
    createdAt: new Date(Date.now() - 30 * 60 * 1000),
  },
  // Order 2 deliveries
  {
    id: 'd3',
    orderId: 'o2',
    pickupAddress: 'Av. Goiás, 1500 - Centro',
    dropoffAddress: 'Condomínio Residencial, Bloco B, Apt 302',
    packageType: 'small_box',
    notes: 'Frágil - manusear com cuidado',
    suggestedPrice: 12,
    createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
  },
  // Order 3 deliveries
  {
    id: 'd4',
    orderId: 'o3',
    pickupAddress: 'Av. Goiás, 1500 - Centro',
    dropoffAddress: 'Rua Tocantins, 890 - Setor Oeste',
    packageType: 'bag',
    suggestedPrice: 9,
    createdAt: new Date(Date.now() - 4 * 60 * 60 * 1000),
  },
  {
    id: 'd5',
    orderId: 'o3',
    pickupAddress: 'Av. Goiás, 1500 - Centro',
    dropoffAddress: 'Av. Brasil, 456 - Centro',
    packageType: 'envelope',
    suggestedPrice: 6,
    createdAt: new Date(Date.now() - 4 * 60 * 60 * 1000),
  },
  // Order 4 deliveries (completed)
  {
    id: 'd6',
    orderId: 'o4',
    pickupAddress: 'Av. Goiás, 1500 - Centro',
    dropoffAddress: 'Rua São Paulo, 123 - Centro',
    packageType: 'bag',
    suggestedPrice: 9,
    createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000),
  },
];

// Mock Orders
export const mockOrders: Order[] = [
  {
    id: 'o1',
    companyUserId: '2',
    status: 'pending',
    totalValue: 15,
    deliveries: mockOrderDeliveries.filter(d => d.orderId === 'o1'),
    createdAt: new Date(Date.now() - 30 * 60 * 1000),
    updatedAt: new Date(Date.now() - 30 * 60 * 1000),
  },
  {
    id: 'o2',
    companyUserId: '2',
    driverUserId: '4',
    status: 'accepted',
    totalValue: 12,
    deliveries: mockOrderDeliveries.filter(d => d.orderId === 'o2'),
    createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
    updatedAt: new Date(Date.now() - 1 * 60 * 60 * 1000),
    acceptedAt: new Date(Date.now() - 1 * 60 * 60 * 1000),
  },
  {
    id: 'o3',
    companyUserId: '2',
    driverUserId: '5',
    status: 'driver_completed',
    totalValue: 15,
    deliveries: mockOrderDeliveries.filter(d => d.orderId === 'o3'),
    createdAt: new Date(Date.now() - 4 * 60 * 60 * 1000),
    updatedAt: new Date(Date.now() - 30 * 60 * 1000),
    acceptedAt: new Date(Date.now() - 3 * 60 * 60 * 1000),
    driverCompletedAt: new Date(Date.now() - 30 * 60 * 1000),
  },
  {
    id: 'o4',
    companyUserId: '2',
    driverUserId: '4',
    status: 'completed',
    totalValue: 9,
    deliveries: mockOrderDeliveries.filter(d => d.orderId === 'o4'),
    createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000),
    updatedAt: new Date(Date.now() - 20 * 60 * 60 * 1000),
    acceptedAt: new Date(Date.now() - 23 * 60 * 60 * 1000),
    driverCompletedAt: new Date(Date.now() - 21 * 60 * 60 * 1000),
    completedAt: new Date(Date.now() - 20 * 60 * 60 * 1000),
  },
];

// Mock Notifications
export const mockNotifications: Notification[] = [
  {
    id: 'n1',
    userId: '2',
    tag: 'deliveries',
    title: 'Pedido aceito',
    message: 'João Silva aceitou seu pedido #o2',
    createdAt: new Date(Date.now() - 1 * 60 * 60 * 1000),
  },
  {
    id: 'n2',
    userId: '2',
    tag: 'deliveries',
    title: 'Entregador finalizou',
    message: 'Maria Santos finalizou o pedido #o3. Confirme o recebimento.',
    createdAt: new Date(Date.now() - 30 * 60 * 1000),
  },
  {
    id: 'n3',
    userId: '4',
    tag: 'credits',
    title: 'Créditos adicionados',
    message: 'Você recebeu 5 créditos. Válido até 5 dias.',
    createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
    readAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
  },
];

// Mock Admin Alerts
export const mockAdminAlerts: AdminAlert[] = [];

// Mock Ratings
export const mockRatings: Rating[] = [
  {
    id: 'r1',
    orderId: 'o4',
    fromUserId: '2',
    toUserId: '4',
    stars: 5,
    comment: 'Excelente entregador, rápido e educado!',
    createdAt: new Date(Date.now() - 20 * 60 * 60 * 1000),
  },
];

// Helper functions
export const getUserById = (id: string): User | undefined => {
  return mockUsers.find(u => u.id === id);
};

export const getCompanyProfile = (userId: string): CompanyProfile | undefined => {
  return mockCompanyProfiles.find(p => p.userId === userId);
};

export const getDriverProfile = (userId: string): DriverProfile | undefined => {
  return mockDriverProfiles.find(p => p.userId === userId);
};

export const getUserCredits = (userId: string): Credits | undefined => {
  return mockCredits.find(c => c.userId === userId);
};

export const hasValidCredits = (user: User): boolean => {
  const credits = getUserCredits(user.id);
  if (!credits) return false;
  return toBrasiliaDate() < new Date(credits.validUntil);
};

export const getCreditsValidUntil = (userId: string): Date | null => {
  const credits = getUserCredits(userId);
  return credits ? credits.validUntil : null;
};

// Order helpers
export const getOrdersByCompany = (companyUserId: string): Order[] => {
  return mockOrders.filter(o => o.companyUserId === companyUserId);
};

export const getOrdersByDriver = (driverUserId: string): Order[] => {
  return mockOrders.filter(o => o.driverUserId === driverUserId);
};

export const getAvailableOrders = (): Order[] => {
  return mockOrders.filter(o => o.status === 'pending');
};

export const getOrdersByStatus = (status: OrderStatus): Order[] => {
  return mockOrders.filter(o => o.status === status);
};

// Get user notifications
export const getUserNotifications = (userId: string): Notification[] => {
  return mockNotifications.filter(n => n.userId === userId);
};

// Get admin alerts for user
export const getUserAlerts = (userId: string): AdminAlert[] => {
  return mockAdminAlerts.filter(a => a.targetUserId === userId && a.active);
};

// Get user ratings
export const getUserRatings = (userId: string): Rating[] => {
  return mockRatings.filter(r => r.toUserId === userId);
};

export const getUserAverageRating = (userId: string): number | null => {
  const ratings = getUserRatings(userId);
  if (ratings.length === 0) return null;
  return ratings.reduce((sum, r) => sum + r.stars, 0) / ratings.length;
};

// Stats helpers
export const getStats = () => ({
  totalUsers: mockUsers.length,
  totalCompanies: mockUsers.filter(u => u.role === 'company').length,
  totalDrivers: mockUsers.filter(u => u.role === 'driver').length,
  activeUsers: mockUsers.filter(u => hasValidCredits(u)).length,
  totalOrders: mockOrders.length,
  pendingOrders: mockOrders.filter(o => o.status === 'pending').length,
  acceptedOrders: mockOrders.filter(o => o.status === 'accepted').length,
  completedOrders: mockOrders.filter(o => o.status === 'completed').length,
  cancelledOrders: mockOrders.filter(o => o.status === 'cancelled').length,
});
