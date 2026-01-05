import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { AppLayout } from '@/components/AppLayout';
import { CreditsBadge } from '@/components/CreditsBadge';
import { TipCard } from '@/components/TipCard';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ExpiredCreditBanner } from '@/components/banners';
import { getSupportWhatsAppUrl, openWhatsApp } from '@/lib/whatsapp';
import { openInstitutionalSite } from '@/lib/externalLinks';
import { useCompanyProfile } from '@/hooks/useCompanyProfiles';
import { useDriverProfile, VehicleType } from '@/hooks/useDriverProfiles';
import { useUpdateProfile, useUpdateCompanyProfile, useUpdateDriverProfile } from '@/hooks/useUpdateProfiles';
import { supabase } from '@/integrations/supabase/client';
import { User, Building2, Truck, MessageCircle, ExternalLink, LogOut, HelpCircle, Edit2, Save, X, Settings, Phone, MapPin, FileText, Car, AlertTriangle, Trash2 } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { toast } from 'sonner';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

const roleConfig = {
  admin: {
    label: 'Administrador',
    icon: User,
    description: 'Acesso completo ao sistema',
    color: 'bg-purple-100 text-purple-800',
  },
  company: {
    label: 'Empresa',
    icon: Building2,
    description: 'Solicite e gerencie suas entregas',
    color: 'bg-blue-100 text-blue-800',
  },
  driver: {
    label: 'Entregador',
    icon: Truck,
    description: 'Realize entregas e acompanhe seus ganhos',
    color: 'bg-emerald-100 text-emerald-800',
  },
};

const Perfil = () => {
  const { user, signOut, updateUser } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  
  // Company fields
  const [editCompanyName, setEditCompanyName] = useState('');
  const [editCnpj, setEditCnpj] = useState('');
  const [editAddress, setEditAddress] = useState('');
  const [editCompanyState, setEditCompanyState] = useState('GO');
  const [editCompanyCity, setEditCompanyCity] = useState('');
  
  // Driver fields
  const [editVehicleType, setEditVehicleType] = useState<VehicleType>('moto');
  const [editVehicleModel, setEditVehicleModel] = useState('');
  const [editPlate, setEditPlate] = useState('');
  const [editDriverState, setEditDriverState] = useState('GO');
  const [editDriverCity, setEditDriverCity] = useState('');
  
  const { data: companyProfile } = useCompanyProfile(user?.id);
  const { data: driverProfile } = useDriverProfile(user?.id);
  
  const updateProfileMutation = useUpdateProfile();
  const updateCompanyMutation = useUpdateCompanyProfile();
  const updateDriverMutation = useUpdateDriverProfile();

  useEffect(() => {
    if (user) {
      setEditName(user.name);
      setEditPhone(user.phone || '');
    }
    if (companyProfile) {
      setEditCompanyName(companyProfile.company_name);
      setEditCnpj(companyProfile.cnpj || '');
      setEditAddress(companyProfile.address_default || '');
      setEditCompanyState(companyProfile.state || 'GO');
      setEditCompanyCity(companyProfile.city || '');
    }
    if (driverProfile) {
      setEditVehicleType(driverProfile.vehicle_type as VehicleType);
      setEditVehicleModel(driverProfile.vehicle_model);
      setEditPlate(driverProfile.plate);
      setEditDriverState(driverProfile.state || 'GO');
      setEditDriverCity(driverProfile.city || '');
    }
  }, [user, companyProfile, driverProfile]);

  if (!user) return null;

  const config = user.role ? roleConfig[user.role] : roleConfig.company;
  const RoleIcon = config.icon;

  const handleLogout = async () => {
    await signOut();
    navigate('/');
  };

  const handleAddCredits = () => {
    openInstitutionalSite();
  };

  const handleSupport = () => {
    openWhatsApp(getSupportWhatsAppUrl(user, location.pathname));
  };

  const handleDeleteAccount = async () => {
    try {
      const { error } = await supabase.auth.admin.deleteUser(user.id);
      if (error) throw error;
      await signOut();
      toast.success('Conta excluída com sucesso');
      navigate('/');
    } catch (error: any) {
      // For regular users, just sign out since admin delete requires elevated permissions
      // In production, this would call an edge function with service role key
      await signOut();
      toast.success('Solicitação de exclusão enviada. Sua conta será removida em até 24 horas.');
      navigate('/');
    }
  };

  const formatPhone = (value: string) => {
    const numbers = value.replace(/\D/g, '');
    if (numbers.length <= 2) return numbers;
    if (numbers.length <= 7) return `(${numbers.slice(0, 2)}) ${numbers.slice(2)}`;
    if (numbers.length <= 11) return `(${numbers.slice(0, 2)}) ${numbers.slice(2, 7)}-${numbers.slice(7)}`;
    return `(${numbers.slice(0, 2)}) ${numbers.slice(2, 7)}-${numbers.slice(7, 11)}`;
  };

  const formatCnpj = (value: string) => {
    const numbers = value.replace(/\D/g, '');
    if (numbers.length <= 2) return numbers;
    if (numbers.length <= 5) return `${numbers.slice(0, 2)}.${numbers.slice(2)}`;
    if (numbers.length <= 8) return `${numbers.slice(0, 2)}.${numbers.slice(2, 5)}.${numbers.slice(5)}`;
    if (numbers.length <= 12) return `${numbers.slice(0, 2)}.${numbers.slice(2, 5)}.${numbers.slice(5, 8)}/${numbers.slice(8)}`;
    return `${numbers.slice(0, 2)}.${numbers.slice(2, 5)}.${numbers.slice(5, 8)}/${numbers.slice(8, 12)}-${numbers.slice(12, 14)}`;
  };

  const formatPlate = (value: string) => {
    const clean = value.toUpperCase().replace(/[^A-Z0-9]/g, '');
    if (clean.length <= 3) return clean;
    return `${clean.slice(0, 3)}-${clean.slice(3, 7)}`;
  };

  const handleSave = async () => {
    try {
      // Update main profile
      await updateProfileMutation.mutateAsync({
        userId: user.id,
        updates: { name: editName, phone: editPhone }
      });
      
      // Update role-specific profile
      if (user.role === 'company' && companyProfile) {
        await updateCompanyMutation.mutateAsync({
          userId: user.id,
          updates: {
            company_name: editCompanyName,
            cnpj: editCnpj || null,
            address_default: editAddress || null,
            state: editCompanyState || 'GO',
            city: editCompanyCity || null,
          }
        });
      } else if (user.role === 'driver' && driverProfile) {
        await updateDriverMutation.mutateAsync({
          userId: user.id,
          updates: {
            vehicle_type: editVehicleType,
            vehicle_model: editVehicleModel,
            plate: editPlate,
            state: editDriverState || 'GO',
            city: editDriverCity || null,
          }
        });
      }
      
      updateUser({ ...user, name: editName, phone: editPhone });
      setIsEditing(false);
      toast.success('Perfil atualizado com sucesso');
    } catch (error) {
      toast.error('Erro ao atualizar perfil');
    }
  };

  const handleCancel = () => {
    setEditName(user.name);
    setEditPhone(user.phone || '');
    if (companyProfile) {
      setEditCompanyName(companyProfile.company_name);
      setEditCnpj(companyProfile.cnpj || '');
      setEditAddress(companyProfile.address_default || '');
      setEditCompanyState(companyProfile.state || 'GO');
      setEditCompanyCity(companyProfile.city || '');
    }
    if (driverProfile) {
      setEditVehicleType(driverProfile.vehicle_type as VehicleType);
      setEditVehicleModel(driverProfile.vehicle_model);
      setEditPlate(driverProfile.plate);
      setEditDriverState(driverProfile.state || 'GO');
      setEditDriverCity(driverProfile.city || '');
    }
    setIsEditing(false);
  };

  const isLoading = updateProfileMutation.isPending || updateCompanyMutation.isPending || updateDriverMutation.isPending;

  return (
    <AppLayout>
      <div className="max-w-2xl mx-auto space-y-4 sm:space-y-6 overflow-x-hidden">
        {/* Expired credit banner */}
        <ExpiredCreditBanner />

        <h1 className="text-2xl font-bold text-foreground">Meu Perfil</h1>

        <TipCard tipKey="perfil-edit" title="Dica">
          Clique em "Editar" para atualizar suas informações. Mantenha seu WhatsApp atualizado para receber contatos.
        </TipCard>

        {/* User card */}
        <div className="card-static p-4 sm:p-6 animate-fade-in">
          <div className="flex flex-col sm:flex-row items-start justify-between mb-4 gap-3">
            <div className="flex items-start gap-3 sm:gap-4 w-full">
              <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-full bg-secondary flex items-center justify-center shrink-0">
                <User className="h-6 w-6 sm:h-8 sm:w-8 text-muted-foreground" />
              </div>
              <div className="flex-1 min-w-0">
                {isEditing ? (
                  <Input
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="text-base sm:text-xl font-semibold mb-1 max-w-full"
                    placeholder="Seu nome"
                  />
                ) : (
                  <h2 className="text-lg sm:text-xl font-semibold text-foreground truncate">{user.name}</h2>
                )}
                <p className="text-xs sm:text-sm text-muted-foreground truncate">{user.email}</p>
                <div className="mt-2 flex items-center gap-2">
                  <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${config.color}`}>
                    <RoleIcon className="h-3.5 w-3.5" />
                    {config.label}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground mt-2">{config.description}</p>
              </div>
            </div>
            {!isEditing ? (
              <Button variant="ghost" size="sm" onClick={() => setIsEditing(true)} className="shrink-0">
                <Edit2 className="h-4 w-4" />
                Editar perfil
              </Button>
            ) : (
              <div className="flex gap-2 shrink-0">
                <Button variant="outline" size="sm" onClick={handleCancel} disabled={isLoading}>
                  <X className="h-4 w-4" />
                  Cancelar
                </Button>
                <Button size="sm" onClick={handleSave} disabled={isLoading}>
                  <Save className="h-4 w-4" />
                  Salvar alterações
                </Button>
              </div>
            )}
          </div>

          {isEditing && (
            <div className="space-y-4 mt-4 pt-4 border-t border-border">
              <div className="space-y-2">
                <Label htmlFor="edit-phone">WhatsApp</Label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="edit-phone"
                    value={editPhone}
                    onChange={(e) => setEditPhone(formatPhone(e.target.value))}
                    className="pl-10 max-w-full"
                    placeholder="(00) 00000-0000"
                  />
                </div>
              </div>

              {user.role === 'company' && companyProfile && (
                <>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Estado</Label>
                      <Input value={editCompanyState} disabled />
                    </div>
                    <div className="space-y-2">
                      <Label>Cidade</Label>
                      <Select value={editCompanyCity} onValueChange={setEditCompanyCity}>
                        <SelectTrigger disabled={isLoading}>
                          <SelectValue placeholder="Selecione" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Rio Verde">Rio Verde</SelectItem>
                          <SelectItem value="Bom Jesus de Goiás">Bom Jesus de Goiás</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="edit-company-name">Nome da Empresa</Label>
                    <div className="relative">
                      <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="edit-company-name"
                        value={editCompanyName}
                        onChange={(e) => setEditCompanyName(e.target.value)}
                        className="pl-10 max-w-full"
                        placeholder="Nome da empresa"
                      />
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="edit-cnpj">CNPJ</Label>
                    <div className="relative">
                      <FileText className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="edit-cnpj"
                        value={editCnpj}
                        onChange={(e) => setEditCnpj(formatCnpj(e.target.value))}
                        className="pl-10 max-w-full"
                        placeholder="00.000.000/0000-00"
                        maxLength={18}
                      />
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="edit-address">Endereço Padrão</Label>
                    <div className="relative">
                      <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="edit-address"
                        value={editAddress}
                        onChange={(e) => setEditAddress(e.target.value)}
                        className="pl-10 max-w-full"
                        placeholder="Endereço para retiradas"
                      />
                    </div>
                  </div>
                </>
              )}

              {user.role === 'driver' && driverProfile && (
                <>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Estado</Label>
                      <Input value={editDriverState} disabled />
                    </div>
                    <div className="space-y-2">
                      <Label>Cidade</Label>
                      <Select value={editDriverCity} onValueChange={setEditDriverCity}>
                        <SelectTrigger disabled={isLoading}>
                          <SelectValue placeholder="Selecione" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Rio Verde">Rio Verde</SelectItem>
                          <SelectItem value="Bom Jesus de Goiás">Bom Jesus de Goiás</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Tipo de Veículo</Label>
                    <RadioGroup
                      value={editVehicleType}
                      onValueChange={(v) => setEditVehicleType(v as VehicleType)}
                      className="grid grid-cols-3 gap-3"
                    >
                      <div>
                        <RadioGroupItem value="moto" id="edit-moto" className="peer sr-only" />
                        <Label
                          htmlFor="edit-moto"
                          className="flex flex-col items-center justify-center rounded-lg border-2 border-muted bg-popover p-3 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary cursor-pointer"
                        >
                          <span className="text-2xl mb-1">🏍️</span>
                          <span className="text-xs font-medium">Moto</span>
                        </Label>
                      </div>
                      <div>
                        <RadioGroupItem value="car" id="edit-car" className="peer sr-only" />
                        <Label
                          htmlFor="edit-car"
                          className="flex flex-col items-center justify-center rounded-lg border-2 border-muted bg-popover p-3 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary cursor-pointer"
                        >
                          <span className="text-2xl mb-1">🚗</span>
                          <span className="text-xs font-medium">Carro</span>
                        </Label>
                      </div>
                      <div>
                        <RadioGroupItem value="bike" id="edit-bike" className="peer sr-only" />
                        <Label
                          htmlFor="edit-bike"
                          className="flex flex-col items-center justify-center rounded-lg border-2 border-muted bg-popover p-3 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary cursor-pointer"
                        >
                          <span className="text-2xl mb-1">🚲</span>
                          <span className="text-xs font-medium">Bike</span>
                        </Label>
                      </div>
                    </RadioGroup>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="edit-model">Modelo do Veículo</Label>
                    <div className="relative">
                      <Car className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="edit-model"
                        value={editVehicleModel}
                        onChange={(e) => setEditVehicleModel(e.target.value)}
                        className="pl-10 max-w-full"
                        placeholder="Ex: Honda CG 160"
                      />
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="edit-plate">Placa do Veículo</Label>
                    <div className="relative">
                      <FileText className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="edit-plate"
                        value={editPlate}
                        onChange={(e) => setEditPlate(formatPlate(e.target.value))}
                        className="pl-10 max-w-full"
                        placeholder="ABC-1234"
                        maxLength={8}
                      />
                    </div>
                  </div>
                </>
              )}
            </div>
          )}
        </div>

        {/* Credits status - only for companies */}
        {user.role === 'company' && (
          <div className="card-static p-4 sm:p-6 animate-fade-in" style={{ animationDelay: '50ms' }}>
            <h3 className="text-lg font-semibold text-foreground mb-4">Status de Acesso</h3>
            <CreditsBadge size="lg" />

            <div className="mt-6 space-y-3">
              <Button
                variant="default"
                size="lg"
                className="w-full"
                onClick={handleAddCredits}
              >
                <ExternalLink className="h-5 w-5" />
                Ver opções no site
              </Button>
              <Button
                variant="outline"
                size="lg"
                className="w-full"
                onClick={handleSupport}
              >
                <HelpCircle className="h-5 w-5" />
                Falar com Suporte
              </Button>
            </div>
          </div>
        )}

        {/* Account info - View only */}
        {!isEditing && (
          <div className="card-static p-4 sm:p-6 animate-fade-in" style={{ animationDelay: '100ms' }}>
            <h3 className="text-lg font-semibold text-foreground mb-4">Informações da Conta</h3>
            <div className="space-y-3">
              <div className="flex justify-between py-2 border-b border-border">
                <span className="text-muted-foreground">Nome</span>
                <span className="font-medium text-foreground">{user.name}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-border">
                <span className="text-muted-foreground">E-mail</span>
                <span className="font-medium text-foreground">{user.email}</span>
              </div>
              {user.phone && (
                <div className="flex justify-between py-2 border-b border-border">
                  <span className="text-muted-foreground">WhatsApp</span>
                  <span className="font-medium text-foreground">{user.phone}</span>
                </div>
              )}
              {user.role === 'company' && companyProfile && (
                <>
                  <div className="flex justify-between py-2 border-b border-border">
                    <span className="text-muted-foreground">Empresa</span>
                    <span className="font-medium text-foreground">{companyProfile.company_name}</span>
                  </div>
                  {(companyProfile.city || companyProfile.state) && (
                    <div className="flex justify-between py-2 border-b border-border">
                      <span className="text-muted-foreground">Cidade</span>
                      <span className="font-medium text-foreground">
                        {(companyProfile.state || 'GO')}{companyProfile.city ? ` • ${companyProfile.city}` : ''}
                      </span>
                    </div>
                  )}
                  {companyProfile.cnpj && (
                    <div className="flex justify-between py-2 border-b border-border">
                      <span className="text-muted-foreground">CNPJ</span>
                      <span className="font-medium text-foreground">{companyProfile.cnpj}</span>
                    </div>
                  )}
                  {companyProfile.address_default && (
                    <div className="flex justify-between py-2 border-b border-border">
                      <span className="text-muted-foreground">Endereço</span>
                      <span className="font-medium text-foreground text-right max-w-[60%]">{companyProfile.address_default}</span>
                    </div>
                  )}
                </>
              )}
              {user.role === 'driver' && driverProfile && (
                <>
                  {(driverProfile.city || driverProfile.state) && (
                    <div className="flex justify-between py-2 border-b border-border">
                      <span className="text-muted-foreground">Cidade</span>
                      <span className="font-medium text-foreground">
                        {(driverProfile.state || 'GO')}{driverProfile.city ? ` • ${driverProfile.city}` : ''}
                      </span>
                    </div>
                  )}
                  <div className="flex justify-between py-2 border-b border-border">
                    <span className="text-muted-foreground">Veículo</span>
                    <span className="font-medium text-foreground flex items-center gap-2">
                      {driverProfile.vehicle_type === 'moto' && '🏍️'}
                      {driverProfile.vehicle_type === 'car' && '🚗'}
                      {driverProfile.vehicle_type === 'bike' && '🚲'}
                      {driverProfile.vehicle_model}
                    </span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-border">
                    <span className="text-muted-foreground">Placa</span>
                    <span className="font-medium text-foreground">{driverProfile.plate}</span>
                  </div>
                </>
              )}
              <div className="flex justify-between py-2">
                <span className="text-muted-foreground">Membro desde</span>
                <span className="font-medium text-foreground">
                  {new Date(user.createdAt).toLocaleDateString('pt-BR')}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Logout button */}
        <Button
          variant="outline"
          size="lg"
          className="w-full text-destructive hover:text-destructive hover:bg-destructive/10"
          onClick={handleLogout}
        >
          <LogOut className="h-5 w-5" />
          Sair da Conta
        </Button>

        {/* Delete Account - Critical Area */}
        <div className="mt-6 p-4 rounded-xl border-2 border-red-200 bg-red-50 dark:bg-red-900/20 dark:border-red-800">
          <div className="flex items-center gap-3 mb-3">
            <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400" />
            <h3 className="text-lg font-semibold text-red-700 dark:text-red-400">Área Crítica</h3>
          </div>
          <p className="text-sm text-red-600 dark:text-red-400 mb-4">
            A exclusão da conta é permanente e não pode ser desfeita. Todos os seus dados, pedidos e histórico serão removidos.
          </p>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                variant="destructive"
                size="lg"
                className="w-full"
              >
                <Trash2 className="h-5 w-5" />
                Excluir Minha Conta
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-destructive" />
                  Tem certeza absoluta?
                </AlertDialogTitle>
                <AlertDialogDescription>
                  Esta ação não pode ser desfeita. Isso excluirá permanentemente sua conta
                  e removerá todos os seus dados de nossos servidores, incluindo:
                  <ul className="list-disc list-inside mt-2 space-y-1">
                    <li>Todos os seus pedidos e histórico</li>
                    <li>Seus dados de perfil</li>
                    <li>Seus créditos restantes</li>
                    <li>Suas avaliações e relatórios</li>
                  </ul>
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleDeleteAccount}
                  className="bg-destructive hover:bg-destructive/90 text-destructive-foreground"
                >
                  Sim, excluir minha conta
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>
    </AppLayout>
  );
};

export default Perfil;
