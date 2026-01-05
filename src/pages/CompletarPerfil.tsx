import { useState, useEffect } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { useAuth, AppRole } from '@/contexts/AuthContext';
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
import { useCompanyProfile, useCreateCompanyProfile, useUpdateCompanyProfile } from '@/hooks/useCompanyProfiles';
import { useDriverProfile, useCreateDriverProfile, useUpdateDriverProfile, VehicleType } from '@/hooks/useDriverProfiles';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useTheme } from 'next-themes';
import logoClaro from '@/assets/logo_tclaro.png';
import logoEscuro from '@/assets/logo_tescuro.png';
import { 
  Loader2, 
  Building2, 
  Truck, 
  Car, 
  MapPin, 
  FileText,
  CheckCircle2,
  ArrowLeft,
  ArrowRight,
  User,
  Phone
} from 'lucide-react';

const CompletarPerfil = () => {
  const { user, updateUser, isAuthenticated, isLoading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { resolvedTheme } = useTheme();
  
  const currentLogo = resolvedTheme === 'dark' ? logoEscuro : logoClaro;
  
  const { data: companyProfile, isLoading: companyLoading } = useCompanyProfile(user?.id);
  const { data: driverProfile, isLoading: driverLoading } = useDriverProfile(user?.id);
  
  const createCompanyProfile = useCreateCompanyProfile();
  const updateCompanyProfile = useUpdateCompanyProfile();
  const createDriverProfile = useCreateDriverProfile();
  const updateDriverProfile = useUpdateDriverProfile();

  // Detect if this is a new OAuth user without role
  const needsRoleSelection = user && !user.role;

  // Step control
  const [step, setStep] = useState(needsRoleSelection ? 0 : 1);
  const totalSteps = needsRoleSelection ? 3 : 2;

  // Role selection for Google signup
  const [selectedRole, setSelectedRole] = useState<'company' | 'driver'>('company');
  const [phone, setPhone] = useState(user?.phone || '');

  // Company fields
  const [companyName, setCompanyName] = useState('');
  const [companyCnpj, setCompanyCnpj] = useState('');
  const [companyAddress, setCompanyAddress] = useState('');

  // Location fields (used for city-based separation)
  const [profileState, setProfileState] = useState('GO');
  const [profileCity, setProfileCity] = useState('');
  
  // Driver fields
  const [vehicleType, setVehicleType] = useState<VehicleType>('moto');
  const [vehicleModel, setVehicleModel] = useState('');
  const [vehiclePlate, setVehiclePlate] = useState('');

  const [loading, setLoading] = useState(false);

  // Draft persistence (localStorage) to prevent data loss after email confirmation
  const draftKey = user ? `flux_profile_draft_${user.id}` : undefined;

  // Update step when needsRoleSelection changes
  useEffect(() => {
    if (needsRoleSelection && step !== 0) {
      setStep(0);
    } else if (!needsRoleSelection && step === 0) {
      setStep(1);
    }
  }, [needsRoleSelection]);

  useEffect(() => {
    if (companyProfile) {
      setCompanyName(companyProfile.company_name || '');
      setCompanyCnpj(companyProfile.cnpj || '');
      setCompanyAddress(companyProfile.address_default || '');
      if (companyProfile.state) setProfileState(companyProfile.state);
      if (companyProfile.city) setProfileCity(companyProfile.city);
    }
  }, [companyProfile]);

  useEffect(() => {
    if (driverProfile) {
      setVehicleType(driverProfile.vehicle_type);
      setVehicleModel(driverProfile.vehicle_model || '');
      setVehiclePlate(driverProfile.plate || '');
      if (driverProfile.state) setProfileState(driverProfile.state);
      if (driverProfile.city) setProfileCity(driverProfile.city);
    }
  }, [driverProfile]);

  useEffect(() => {
    if (user?.phone) {
      setPhone(user.phone);
    }
  }, [user?.phone]);

  // Load draft if exists and no server profile yet
  useEffect(() => {
    if (!draftKey) return;
    // Only apply draft if user has not completed or created specific profile yet
    if (companyProfile || driverProfile) return;
    try {
      const raw = localStorage.getItem(draftKey);
      if (!raw) return;
      const d = JSON.parse(raw);
      if (!d) return;
      if (typeof d.step === 'number') setStep(d.step);
      if (d.selectedRole) setSelectedRole(d.selectedRole);
      if (d.phone) setPhone(d.phone);
      if (d.companyName !== undefined) setCompanyName(d.companyName);
      if (d.companyCnpj !== undefined) setCompanyCnpj(d.companyCnpj);
      if (d.companyAddress !== undefined) setCompanyAddress(d.companyAddress);
      if (d.profileState) setProfileState(d.profileState);
      if (d.profileCity) setProfileCity(d.profileCity);
      if (d.vehicleType) setVehicleType(d.vehicleType);
      if (d.vehicleModel !== undefined) setVehicleModel(d.vehicleModel);
      if (d.vehiclePlate !== undefined) setVehiclePlate(d.vehiclePlate);
    } catch (e) {
      // Ignore invalid JSON
    }
  }, [draftKey, companyProfile, driverProfile]);

  // Save draft on changes
  useEffect(() => {
    if (!draftKey) return;
    const payload = {
      step,
      selectedRole,
      phone,
      companyName,
      companyCnpj,
      companyAddress,
      profileState,
      profileCity,
      vehicleType,
      vehicleModel,
      vehiclePlate,
      ts: Date.now(),
    };
    try {
      localStorage.setItem(draftKey, JSON.stringify(payload));
    } catch {}
  }, [draftKey, step, selectedRole, phone, companyName, companyCnpj, companyAddress, profileState, profileCity, vehicleType, vehicleModel, vehiclePlate]);

  // Redirect to auth if not authenticated
  if (!authLoading && !isAuthenticated) {
    return <Navigate to="/auth" replace />;
  }

  // Show loading while checking auth
  if (authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) return null;

  // If user has role and profile, redirect to dashboard
  const hasCompletedProfile = user.role && (
    (user.role === 'company' && companyProfile) ||
    (user.role === 'driver' && driverProfile) ||
    user.role === 'admin'
  );

  const isLoading = companyLoading || driverLoading;
  const isCompany = needsRoleSelection ? selectedRole === 'company' : user.role === 'company';
  const isDriver = needsRoleSelection ? selectedRole === 'driver' : user.role === 'driver';

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

  const formatPhone = (value: string) => {
    const numbers = value.replace(/\D/g, '');
    if (numbers.length <= 2) return numbers;
    if (numbers.length <= 7) return `(${numbers.slice(0, 2)}) ${numbers.slice(2)}`;
    if (numbers.length <= 11) return `(${numbers.slice(0, 2)}) ${numbers.slice(2, 7)}-${numbers.slice(7)}`;
    return `(${numbers.slice(0, 2)}) ${numbers.slice(2, 7)}-${numbers.slice(7, 11)}`;
  };

  const handleRoleSelection = async () => {
    if (!phone.trim()) {
      toast.error('WhatsApp é obrigatório');
      return;
    }

    setLoading(true);

    try {
      // Set the role using the secure function
      const { data, error } = await supabase.rpc('set_my_role', { p_role: selectedRole });

      if (error) {
        if (error.message.includes('role_already_set')) {
          toast.error('Você já possui um tipo de conta definido');
        } else if (error.message.includes('invalid_role')) {
          toast.error('Tipo de conta inválido');
        } else {
          throw error;
        }
        setLoading(false);
        return;
      }

      // Update phone in profile
      await supabase
        .from('profiles')
        .update({ phone })
        .eq('id', user.id);

      // Update local user state
      updateUser({ role: selectedRole as AppRole, phone });
      
      toast.success('Tipo de conta definido! Complete seus dados.');
      setStep(1);
    } catch (error) {
      console.error('Error setting role:', error);
      toast.error('Erro ao definir tipo de conta');
    }

    setLoading(false);
  };

  const validateStep1 = () => {
    if (isCompany) {
      if (!companyName.trim()) {
        toast.error('Nome da empresa é obrigatório');
        return false;
      }
    }
    return true;
  };

  const validateLocation = () => {
    if (!profileState) {
      toast.error('Estado é obrigatório');
      return false;
    }
    if (!profileCity) {
      toast.error('Cidade é obrigatória');
      return false;
    }
    return true;
  };

  const handleNextStep = () => {
    if (validateStep1()) {
      setStep(step + 1);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateLocation()) return;

    setLoading(true);

    try {
      if (isCompany) {
        if (!companyAddress.trim()) {
          toast.error('Endereço é obrigatório');
          setLoading(false);
          return;
        }

        if (companyProfile) {
          await updateCompanyProfile.mutateAsync({
            userId: user.id,
            updates: {
              company_name: companyName,
              cnpj: companyCnpj || null,
              address_default: companyAddress,
              state: profileState,
              city: profileCity,
            },
          });
        } else {
          await createCompanyProfile.mutateAsync({
            user_id: user.id,
            company_name: companyName,
            cnpj: companyCnpj || null,
            address_default: companyAddress,
            state: profileState,
            city: profileCity,
          });
        }
        toast.success('Perfil da empresa completo!');
      } else if (isDriver) {
        if (!vehicleModel.trim()) {
          toast.error('Modelo do veículo é obrigatório');
          setLoading(false);
          return;
        }
        if (!vehiclePlate.trim()) {
          toast.error('Placa do veículo é obrigatória');
          setLoading(false);
          return;
        }

        if (driverProfile) {
          await updateDriverProfile.mutateAsync({
            userId: user.id,
            updates: {
              vehicle_type: vehicleType,
              vehicle_model: vehicleModel,
              plate: vehiclePlate,
              state: profileState,
              city: profileCity,
            },
          });
        } else {
          await createDriverProfile.mutateAsync({
            user_id: user.id,
            vehicle_type: vehicleType,
            vehicle_model: vehicleModel,
            plate: vehiclePlate,
            state: profileState,
            city: profileCity,
          });
        }
        toast.success('Perfil do entregador completo!');
      }

      // Success: clear draft and navigate
      try { if (draftKey) localStorage.removeItem(draftKey); } catch {}
      navigate('/dashboard');
    } catch (error) {
      const msg = (error as any)?.message;
      toast.error(msg || 'Erro ao salvar perfil');
    }

    setLoading(false);
  };

  const handleBack = () => {
    if (step === 0) {
      navigate('/auth');
    } else if (step === 1 && needsRoleSelection) {
      setStep(0);
    } else if (step === 1) {
      navigate('/dashboard');
    } else {
      setStep(step - 1);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Redirect to dashboard if profile already complete (but not during loading)
  if (!isLoading && hasCompletedProfile) {
    // Clear any draft if profile is already complete
    try { if (draftKey) localStorage.removeItem(draftKey); } catch {}
    return <Navigate to="/dashboard" replace />;
  }

  const currentStep = needsRoleSelection ? step : step;
  const displayStep = needsRoleSelection ? step + 1 : step;

  return (
    <div className="min-h-screen bg-background">
      {/* Simple header for profile completion */}
      <header className="bg-card border-b border-border p-4">
        <div className="flex items-center justify-center gap-3">
          <img src={currentLogo} alt="FLUX" className="w-10 h-10 object-contain" />
          <span className="font-brand text-xl text-foreground">FLUX</span>
        </div>
      </header>
      
      <main className="p-4 lg:p-6">
      <div className="max-w-md mx-auto space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={handleBack}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1">
            <h1 className="text-2xl font-semibold text-foreground">
              {needsRoleSelection && step === 0 ? 'Tipo de Conta' : 'Completar Perfil'}
            </h1>
            <p className="text-muted-foreground">
              Etapa {displayStep} de {totalSteps}
            </p>
          </div>
        </div>

        {/* Progress bar */}
        <div className="flex gap-2">
          {Array.from({ length: totalSteps }).map((_, i) => (
            <div
              key={i}
              className={`h-2 flex-1 rounded-full transition-colors ${
                i + 1 <= displayStep ? 'bg-primary' : 'bg-muted'
              }`}
            />
          ))}
        </div>

        {/* Step 0: Role Selection (only for Google OAuth users) */}
        {needsRoleSelection && step === 0 && (
          <>
            <TipCard tipKey="google-cadastro" title="Bem-vindo!">
              Você entrou com Google. Selecione o tipo de conta e informe seu WhatsApp para continuar.
            </TipCard>

            <div className="card-static p-6 space-y-6 animate-fade-in">
              <div className="flex items-center gap-2 text-lg font-semibold text-foreground mb-4">
                <User className="h-5 w-5" />
                <span>Tipo de Conta</span>
              </div>

              <div className="space-y-3">
                <Label>Escolha seu tipo de conta</Label>
                <RadioGroup
                  value={selectedRole}
                  onValueChange={(v) => setSelectedRole(v as 'company' | 'driver')}
                  className="grid grid-cols-2 gap-3"
                >
                  <div>
                    <RadioGroupItem value="company" id="role-company" className="peer sr-only" />
                    <Label
                      htmlFor="role-company"
                      className="flex flex-col items-center justify-center rounded-lg border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary cursor-pointer"
                    >
                      <Building2 className="mb-2 h-6 w-6" />
                      <span className="text-sm font-medium">Empresa</span>
                      <span className="text-xs text-muted-foreground">Solicitar entregas</span>
                    </Label>
                  </div>
                  <div>
                    <RadioGroupItem value="driver" id="role-driver" className="peer sr-only" />
                    <Label
                      htmlFor="role-driver"
                      className="flex flex-col items-center justify-center rounded-lg border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary cursor-pointer"
                    >
                      <Truck className="mb-2 h-6 w-6" />
                      <span className="text-sm font-medium">Entregador</span>
                      <span className="text-xs text-muted-foreground">Realizar entregas</span>
                    </Label>
                  </div>
                </RadioGroup>
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">WhatsApp *</Label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="phone"
                    type="tel"
                    placeholder="(00) 00000-0000"
                    value={phone}
                    onChange={(e) => setPhone(formatPhone(e.target.value))}
                    className="pl-10"
                    required
                    disabled={loading}
                  />
                </div>
                <p className="text-xs text-muted-foreground">Usado para contato entre empresa e entregador</p>
              </div>

              <Button 
                type="button" 
                className="w-full" 
                size="lg" 
                onClick={handleRoleSelection}
                disabled={loading}
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Salvando...
                  </>
                ) : (
                  <>
                    Continuar
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </>
                )}
              </Button>
            </div>
          </>
        )}

        {/* Show company/driver specific tips only after role is set */}
        {step >= 1 && isCompany && (
          <TipCard tipKey="completar-empresa" title="Importante">
            Complete seu cadastro para solicitar entregas. O endereço será usado como padrão nas suas solicitações.
          </TipCard>
        )}

        {step >= 1 && isDriver && (
          <TipCard tipKey="completar-entregador" title="Importante">
            Cadastre seu veículo corretamente. Essas informações serão visíveis para as empresas.
          </TipCard>
        )}

        {/* Steps 1 & 2: Profile completion */}
        {step >= 1 && (
          <form onSubmit={handleSubmit} className="card-static p-6 space-y-6">
            {/* Step 1: Identification */}
            {((needsRoleSelection && step === 1) || (!needsRoleSelection && step === 1)) && (
              <div className="space-y-4 animate-fade-in">
                <div className="flex items-center gap-2 text-lg font-semibold text-foreground mb-4">
                  <User className="h-5 w-5" />
                  <span>Identificação</span>
                </div>

                {isCompany && (
                  <>
                    <div className="p-3 rounded-lg bg-blue-50 dark:bg-blue-950 text-blue-800 dark:text-blue-200 text-sm">
                      <Building2 className="h-4 w-4 inline mr-2" />
                      Preencha os dados da sua empresa
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="company-name">Nome da Empresa *</Label>
                      <div className="relative">
                        <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="company-name"
                          type="text"
                          placeholder="Nome da sua empresa"
                          value={companyName}
                          onChange={(e) => setCompanyName(e.target.value)}
                          className="pl-10"
                          required
                          disabled={loading}
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="company-cnpj">CNPJ (opcional)</Label>
                      <div className="relative">
                        <FileText className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="company-cnpj"
                          type="text"
                          placeholder="00.000.000/0000-00"
                          value={companyCnpj}
                          onChange={(e) => setCompanyCnpj(formatCnpj(e.target.value))}
                          className="pl-10"
                          disabled={loading}
                          maxLength={18}
                        />
                      </div>
                    </div>
                  </>
                )}

                {isDriver && (
                  <>
                    <div className="p-3 rounded-lg bg-emerald-50 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-200 text-sm">
                      <Truck className="h-4 w-4 inline mr-2" />
                      Selecione o tipo de veículo
                    </div>

                    <div className="space-y-2">
                      <Label>Tipo de Veículo *</Label>
                      <RadioGroup
                        value={vehicleType}
                        onValueChange={(v) => setVehicleType(v as VehicleType)}
                        className="grid grid-cols-3 gap-3"
                      >
                        <div>
                          <RadioGroupItem value="moto" id="vehicle-moto" className="peer sr-only" />
                          <Label
                            htmlFor="vehicle-moto"
                            className="flex flex-col items-center justify-center rounded-lg border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary cursor-pointer transition-all"
                          >
                            <span className="text-3xl mb-2">🏍️</span>
                            <span className="text-sm font-medium">Moto</span>
                          </Label>
                        </div>
                        <div>
                          <RadioGroupItem value="car" id="vehicle-car" className="peer sr-only" />
                          <Label
                            htmlFor="vehicle-car"
                            className="flex flex-col items-center justify-center rounded-lg border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary cursor-pointer transition-all"
                          >
                            <span className="text-3xl mb-2">🚗</span>
                            <span className="text-sm font-medium">Carro</span>
                          </Label>
                        </div>
                        <div>
                          <RadioGroupItem value="bike" id="vehicle-bike" className="peer sr-only" />
                          <Label
                            htmlFor="vehicle-bike"
                            className="flex flex-col items-center justify-center rounded-lg border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary cursor-pointer transition-all"
                          >
                            <span className="text-3xl mb-2">🚲</span>
                            <span className="text-sm font-medium">Bike</span>
                          </Label>
                        </div>
                      </RadioGroup>
                    </div>
                  </>
                )}

                <Button 
                  type="button" 
                  className="w-full" 
                  size="lg" 
                  onClick={handleNextStep}
                >
                  Continuar
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </div>
            )}

            {/* Step 2: Details */}
            {((needsRoleSelection && step === 2) || (!needsRoleSelection && step === 2)) && (
              <div className="space-y-4 animate-fade-in">
                <div className="flex items-center gap-2 text-lg font-semibold text-foreground mb-4">
                  {isCompany ? <MapPin className="h-5 w-5" /> : <Car className="h-5 w-5" />}
                  <span>{isCompany ? 'Endereço' : 'Dados do Veículo'}</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Estado *</Label>
                    <Input value={profileState} disabled />
                  </div>
                  <div className="space-y-2">
                    <Label>Cidade *</Label>
                    <Select value={profileCity} onValueChange={setProfileCity}>
                      <SelectTrigger disabled={loading}>
                        <SelectValue placeholder="Selecione" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Rio Verde">Rio Verde</SelectItem>
                        <SelectItem value="Bom Jesus de Goiás">Bom Jesus de Goiás</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {isCompany && (
                  <>
                    <div className="p-3 rounded-lg bg-blue-50 dark:bg-blue-950 text-blue-800 dark:text-blue-200 text-sm">
                      Informe o endereço padrão para retiradas
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="company-address">Endereço Padrão *</Label>
                      <div className="relative">
                        <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="company-address"
                          type="text"
                          placeholder="Endereço completo para retiradas"
                          value={companyAddress}
                          onChange={(e) => setCompanyAddress(e.target.value)}
                          className="pl-10"
                          required
                          disabled={loading}
                        />
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Este endereço será preenchido automaticamente nas suas solicitações de entrega
                      </p>
                    </div>
                  </>
                )}

                {isDriver && (
                  <>
                    <div className="p-3 rounded-lg bg-emerald-50 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-200 text-sm">
                      Informe os dados do seu veículo
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="vehicle-model">Modelo do Veículo *</Label>
                      <div className="relative">
                        <Car className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="vehicle-model"
                          type="text"
                          placeholder="Ex: Honda CG 160"
                          value={vehicleModel}
                          onChange={(e) => setVehicleModel(e.target.value)}
                          className="pl-10"
                          required
                          disabled={loading}
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="vehicle-plate">Placa do Veículo *</Label>
                      <div className="relative">
                        <FileText className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="vehicle-plate"
                          type="text"
                          placeholder="ABC-1234"
                          value={vehiclePlate}
                          onChange={(e) => setVehiclePlate(formatPlate(e.target.value))}
                          className="pl-10"
                          required
                          disabled={loading}
                          maxLength={8}
                        />
                      </div>
                      <p className="text-xs text-muted-foreground">
                        A placa será visível para as empresas que você aceitar entregas
                      </p>
                    </div>
                  </>
                )}

                <Button type="submit" className="w-full" size="lg" disabled={loading}>
                  {loading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Salvando...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="h-4 w-4" />
                      Finalizar Cadastro
                    </>
                  )}
                </Button>
              </div>
            )}
          </form>
        )}
      </div>
      </main>
    </div>
  );
};

export default CompletarPerfil;