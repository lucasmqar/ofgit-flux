import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { createStripeCheckout, supabase } from "@/lib/supabase";
import { Building2, Bike, Car, UserCircle, LogOut, CreditCard, FileText, ArrowLeft, CheckCircle, Info } from "lucide-react";
import logoTescuro from "@/assets/logo_tescuro.png";

const formatPhone = (value: string) => {
  const numbers = value.replace(/\D/g, "");
  if (numbers.length <= 2) return numbers;
  if (numbers.length <= 7) return `(${numbers.slice(0, 2)}) ${numbers.slice(2)}`;
  if (numbers.length <= 11) return `(${numbers.slice(0, 2)}) ${numbers.slice(2, 7)}-${numbers.slice(7)}`;
  return `(${numbers.slice(0, 2)}) ${numbers.slice(2, 7)}-${numbers.slice(7, 11)}`;
};

const formatCnpj = (value: string) => {
  const numbers = value.replace(/\D/g, "");
  if (numbers.length <= 2) return numbers;
  if (numbers.length <= 5) return `${numbers.slice(0, 2)}.${numbers.slice(2)}`;
  if (numbers.length <= 8) return `${numbers.slice(0, 2)}.${numbers.slice(2, 5)}.${numbers.slice(5)}`;
  if (numbers.length <= 12) return `${numbers.slice(0, 2)}.${numbers.slice(2, 5)}.${numbers.slice(5, 8)}/${numbers.slice(8)}`;
  return `${numbers.slice(0, 2)}.${numbers.slice(2, 5)}.${numbers.slice(5, 8)}/${numbers.slice(8, 12)}-${numbers.slice(12, 14)}`;
};

const formatPlate = (value: string) => {
  const clean = value.toUpperCase().replace(/[^A-Z0-9]/g, "");
  if (clean.length <= 3) return clean;
  return `${clean.slice(0, 3)}-${clean.slice(3, 7)}`;
};

const isValidCnpj = (value: string) => value.replace(/\D/g, "").length === 14;
const isValidPlate = (value: string) => /^[A-Z]{3}-?[0-9][A-Z0-9][0-9]{2}$/.test(value);

export default function Login() {
  const [, setLocation] = useLocation();
  const { isAuthenticated, isLoading, profile, supabaseUser, role, signInWithGoogle, signInWithPassword, signUpWithPassword, setMyRole, refresh } = useAuth();

  const autoCheckoutAttemptedRef = useRef(false);
  const checkoutInFlightRef = useRef(false);

  const [activeTab, setActiveTab] = useState<"login" | "signup">("login");

  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");

  const [signupName, setSignupName] = useState("");
  const [signupEmail, setSignupEmail] = useState("");
  const [signupPassword, setSignupPassword] = useState("");
  const [signupRole, setSignupRole] = useState<"company" | "driver">("company");
  const [signupStep, setSignupStep] = useState<1 | 2 | 3>(1);
  const [signupPhone, setSignupPhone] = useState("");
  const [signupState] = useState("GO"); // Estado fixo: Goiás
  const [signupCity, setSignupCity] = useState("");
  const [signupCompanyName, setSignupCompanyName] = useState("");
  const [signupCnpj, setSignupCnpj] = useState("");
  const [signupVehicleType, setSignupVehicleType] = useState<"moto" | "car" | "bike">("moto");
  const [signupVehicleModel, setSignupVehicleModel] = useState("");
  const [signupPlate, setSignupPlate] = useState("");

  // Keep separate busy flags so checkout attempts don't freeze auth/profile completion UIs.
  const [authBusy, setAuthBusy] = useState(false);
  const [checkoutBusy, setCheckoutBusy] = useState(false);
  const [completionBusy, setCompletionBusy] = useState(false);

  // Profile completion after OAuth
  const [roleProfile, setRoleProfile] = useState<any | null>(null);
  const [roleProfileLoading, setRoleProfileLoading] = useState(false);
  const [roleProfileLoadedOnce, setRoleProfileLoadedOnce] = useState(false);
  const [completionName, setCompletionName] = useState("");
  const [completionPhone, setCompletionPhone] = useState("");
  const [completionState, setCompletionState] = useState("GO");
  const [completionCity, setCompletionCity] = useState("");
  const [completionCompanyName, setCompletionCompanyName] = useState("");
  const [completionCnpj, setCompletionCnpj] = useState("");
  const [completionVehicleType, setCompletionVehicleType] = useState<"moto" | "car" | "bike">("moto");
  const [completionVehicleModel, setCompletionVehicleModel] = useState("");
  const [completionPlate, setCompletionPlate] = useState("");

  const getPendingPlan = () => window.sessionStorage.getItem("pendingCheckoutPlanKey");

  // Automaticamente detectar role pelo plano pendente
  useEffect(() => {
    const pending = getPendingPlan();
    if (pending) {
      if (pending.startsWith("company_")) {
        setSignupRole("company");
      } else if (pending.startsWith("driver_")) {
        setSignupRole("driver");
      }
    }
  }, []);

  const startCheckoutIfPending = async (): Promise<boolean> => {
    const pending = getPendingPlan();
    console.log("[startCheckoutIfPending] Iniciando... pendingPlan:", pending);
    if (!pending) {
      console.log("[startCheckoutIfPending] Nenhum plano pendente");
      return false;
    }

    if (checkoutInFlightRef.current) {
      console.log("[startCheckoutIfPending] Já existe checkout em andamento, ignorando.");
      return false;
    }

    // Reserve the pending key immediately to avoid double-triggering from multiple call sites.
    window.sessionStorage.removeItem("pendingCheckoutPlanKey");
    checkoutInFlightRef.current = true;

    try {
      console.log("[startCheckoutIfPending] Chamando createStripeCheckout com:", pending);
      setCheckoutBusy(true);
      const checkoutUrl = await createStripeCheckout(pending);
      console.log("[startCheckoutIfPending] ✅ URL recebida, redirecionando...", checkoutUrl.slice(0,50) + "...");
      window.location.href = checkoutUrl;
      return true;
    } catch (err) {
      console.error("[startCheckoutIfPending] ❌ ERRO:", err instanceof Error ? err.message : String(err));
      // Restore the pending plan so the user can retry.
      try {
        window.sessionStorage.setItem("pendingCheckoutPlanKey", pending);
      } catch {
        // ignore
      }
      const message = err instanceof Error ? err.message : "checkout_failed";
      toast.error(`Não foi possível iniciar o pagamento: ${message}`);
      return false;
    } finally {
      setCheckoutBusy(false);
      checkoutInFlightRef.current = false;
    }
  };

  const displayName = useMemo(() => {
    if (profile?.name) return profile.name;
    return null;
  }, [profile]);

  const loadRoleProfile = useCallback(async () => {
    if (!isAuthenticated || !role || !supabaseUser?.id) return null;
    setRoleProfileLoading(true);
    try {
      if (role === "company") {
        const { data } = await supabase
          .from("company_profiles")
          .select("company_name, state, city, cnpj")
          .eq("user_id", supabaseUser.id)
          .maybeSingle();
        setRoleProfile(data ?? null);
        return data ?? null;
      }

      if (role === "driver") {
        const { data } = await supabase
          .from("driver_profiles")
          .select("vehicle_type, vehicle_model, plate, state, city")
          .eq("user_id", supabaseUser.id)
          .maybeSingle();
        setRoleProfile(data ?? null);
        return data ?? null;
      }

      return null;
    } finally {
      setRoleProfileLoading(false);
      setRoleProfileLoadedOnce(true);
    }
  }, [isAuthenticated, role, supabaseUser?.id]);

  useEffect(() => {
    // When role/user changes, wait for the first successful roleProfile fetch
    // before deciding between "complete profile" vs "already connected".
    setRoleProfileLoadedOnce(false);
    if (!role || !isAuthenticated || !supabaseUser?.id) return;
    void loadRoleProfile();
  }, [role, isAuthenticated, supabaseUser?.id, loadRoleProfile]);

  useEffect(() => {
    if (!roleProfile) return;
    setCompletionState(roleProfile.state ?? "GO");
    setCompletionCity(roleProfile.city ?? "");
    setCompletionCompanyName(roleProfile.company_name ?? "");
    setCompletionCnpj(roleProfile.cnpj ? formatCnpj(roleProfile.cnpj) : "");
    setCompletionVehicleType((roleProfile.vehicle_type as any) ?? "moto");
    setCompletionVehicleModel(roleProfile.vehicle_model ?? "");
    setCompletionPlate(roleProfile.plate ? formatPlate(roleProfile.plate) : "");
    setCompletionName(profile?.name ?? supabaseUser?.user_metadata?.full_name ?? "");
    const rawPhone = profile?.phone ?? (supabaseUser?.user_metadata?.phone as string | undefined) ?? "";
    setCompletionPhone(rawPhone ? formatPhone(rawPhone) : "");
  }, [roleProfile, profile?.name, profile?.phone, supabaseUser?.user_metadata]);

  useEffect(() => {
    if (!role || roleProfile) return;
    setCompletionState("GO");
    setCompletionCity("");
    setCompletionCompanyName("");
    setCompletionCnpj("");
    setCompletionVehicleType("moto");
    setCompletionVehicleModel("");
    setCompletionPlate("");
    setCompletionName(profile?.name ?? supabaseUser?.user_metadata?.full_name ?? "");
    const rawPhone = profile?.phone ?? (supabaseUser?.user_metadata?.phone as string | undefined) ?? "";
    setCompletionPhone(rawPhone ? formatPhone(rawPhone) : "");
  }, [role, roleProfile, profile?.name, profile?.phone, supabaseUser?.user_metadata]);

  const needsCompletion = useMemo(() => {
    if (!role) return false;
    if (!profile?.name || !profile?.phone) return true;
    if (role === "company") {
      return !roleProfile?.company_name || !roleProfile?.city || !roleProfile?.state || !roleProfile?.cnpj;
    }
    if (role === "driver") {
      return (
        !roleProfile?.vehicle_type ||
        !roleProfile?.vehicle_model ||
        !roleProfile?.plate ||
        !roleProfile?.city ||
        !roleProfile?.state
      );
    }
    return false;
  }, [role, profile, roleProfile]);

  const handleCompleteProfile = async () => {
    if (!role || !supabaseUser?.id) return;

    if (!completionName.trim()) {
      toast.error("Informe seu nome.");
      return;
    }

    if (!completionPhone.trim()) {
      toast.error("Informe seu telefone.");
      return;
    }

    if (!completionCity.trim()) {
      toast.error("Selecione a cidade.");
      return;
    }

    if (role === "company" && !completionCompanyName.trim()) {
      toast.error("Informe o nome da empresa.");
      return;
    }

    if (role === "company") {
      const formattedCnpj = formatCnpj(completionCnpj);
      setCompletionCnpj(formattedCnpj);
      if (!isValidCnpj(formattedCnpj)) {
        toast.error("Informe um CNPJ válido.");
        return;
      }
    }

    if (role === "driver") {
      if (!completionVehicleModel.trim()) {
        toast.error("Informe o modelo do veículo.");
        return;
      }
      const formattedPlate = formatPlate(completionPlate);
      setCompletionPlate(formattedPlate);
      if (!isValidPlate(formattedPlate)) {
        toast.error("Informe uma placa válida (ex: ABC1D23).");
        return;
      }
    }

    setCompletionBusy(true);
    try {
      const nameToSave = completionName.trim() || profile?.name || supabaseUser?.user_metadata?.full_name || "";
      const phoneToSave = completionPhone.trim() ? formatPhone(completionPhone) : null;

      console.log("[handleCompleteProfile] INICIANDO perfil save...");
      console.log("[handleCompleteProfile] userID:", supabaseUser?.id);
      console.log("[handleCompleteProfile] role:", role);
      console.log("[handleCompleteProfile] name:", nameToSave);
      console.log("[handleCompleteProfile] phone:", phoneToSave ? "***" : "vazio");

      // Salvar profile
      const { error: profileError } = await supabase
        .from("profiles")
        .upsert(
          {
            id: supabaseUser.id,
            name: nameToSave,
            email: profile?.email ?? supabaseUser?.email ?? "",
            phone: phoneToSave,
          },
          { onConflict: "id" },
        );

      if (profileError) {
        console.error("[handleCompleteProfile] ❌ Profile save ERROR:", profileError.message, profileError);
        throw new Error(`Profile save failed: ${profileError.message}`);
      }
      console.log("[handleCompleteProfile] ✅ Base profile salvo");

      if (role === "company") {
        const cnpjRaw = formatCnpj(completionCnpj).trim().replace(/\D/g, '');
        console.log("[handleCompleteProfile] Salvando company_profiles...", {company_name: completionCompanyName.trim(), cnpj_len: cnpjRaw.length});
        const { error: companyError } = await supabase
          .from("company_profiles")
          .upsert(
            {
              user_id: supabaseUser.id,
              company_name: completionCompanyName.trim(),
              cnpj: cnpjRaw,
              state: completionState.trim(),
              city: completionCity.trim(),
            },
            { onConflict: "user_id" },
          );

        if (companyError) {
          console.error("[handleCompleteProfile] ❌ Company save ERROR:", companyError.message, companyError);
          throw new Error(`Company profile save failed: ${companyError.message}`);
        }
        console.log("[handleCompleteProfile] ✅ Company profile salvo");
      }

      if (role === "driver") {
        const plateRaw = formatPlate(completionPlate)
          .trim()
          .toUpperCase()
          .replace(/[^A-Z0-9]/g, "");
        console.log("[handleCompleteProfile] Salvando driver_profiles...", {vehicle_type: completionVehicleType, plate: plateRaw});
        const { error: driverError } = await supabase
          .from("driver_profiles")
          .upsert(
            {
              user_id: supabaseUser.id,
              vehicle_type: completionVehicleType,
              vehicle_model: completionVehicleModel.trim(),
              plate: plateRaw,
              state: completionState.trim(),
              city: completionCity.trim(),
            },
            { onConflict: "user_id" },
          );

        if (driverError) {
          console.error("[handleCompleteProfile] ❌ Driver save ERROR:", driverError.message, driverError);
          throw new Error(`Driver profile save failed: ${driverError.message}`);
        }
        console.log("[handleCompleteProfile] ✅ Driver profile salvo");
      }

      console.log("[handleCompleteProfile] Chamando refresh()...");
      // Atualizar contexto
      await refresh();
      console.log("[handleCompleteProfile] ✅ Refresh() completo");
      const latest = await loadRoleProfile();
      console.log("[handleCompleteProfile] ✅ RoleProfile carregado:", !!latest);

      toast.success("✅ Perfil salvo! Processando...");

      // Se havia checkout pendente, iniciar após salvar
      const pending = getPendingPlan();
      console.log("[handleCompleteProfile] Checkout pendente?", pending);
      if (pending) {
        console.log("[handleCompleteProfile] Iniciando checkout para plano:", pending);
        toast.info("⏳ Abrindo pagamento...");
        await new Promise(resolve => setTimeout(resolve, 1200));
        // Prevent the auto-checkout effect from racing this manual trigger.
        autoCheckoutAttemptedRef.current = true;
        void startCheckoutIfPending();
        return;
      }

      // Caso contrário, navegar para plano
      if (latest) {
        console.log("[handleCompleteProfile] Nenhum checkout pendente, redirecionando para /plano");
        await new Promise(resolve => setTimeout(resolve, 500));
        setLocation("/plano");
      }
    } catch (error: any) {
      console.error("[handleCompleteProfile] ❌ ERRO GERAL:", error?.message ?? String(error), error);
      toast.error(error?.message ?? "Não foi possível salvar os dados.");
    } finally {
      console.log("[handleCompleteProfile] Finally - setando completionBusy=false");
      setCompletionBusy(false);
    }
  };

  useEffect(() => {
    // If user returns from OAuth to /login and there is a pending plan,
    // continue straight to Stripe as soon as the user has a role.
    if (isLoading) return;
    if (!isAuthenticated) return;
    if (!role) return;

    // Se o cadastro está incompleto, não tentamos iniciar checkout ainda.
    // Caso contrário, o checkout pode setar busy e travar o botão de completar cadastro.
    if (needsCompletion) return;

    // Only attempt once per page-load to avoid loops when refresh/role updates.
    if (autoCheckoutAttemptedRef.current) return;

    const pending = getPendingPlan();
    if (!pending) return;

    autoCheckoutAttemptedRef.current = true;
    // Visible feedback: user might not have devtools open.
    toast.info("Iniciando pagamento...");
    // eslint-disable-next-line no-console
    console.info("[institucional] auto checkout", { pending, role });
    void startCheckoutIfPending();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoading, isAuthenticated, role, needsCompletion]);

  if (!isLoading && isAuthenticated && role && !roleProfileLoadedOnce) {
    return (
      <div className="min-h-screen bg-mesh-gradient">
        <div className="sticky top-0 z-50 bg-white/90 backdrop-blur-md border-b border-[oklch(0.88_0_0)]">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
            <a href="/" className="flex items-center gap-2">
              <span
                className="font-black text-2xl bg-gradient-to-r from-[oklch(0.15_0_0)] to-[oklch(0.55_0.25_264)] bg-clip-text text-transparent"
                style={{ fontFamily: "'Zen Dots', cursive" }}
              >
                FLUX
              </span>
              <span className="text-xs font-bold uppercase tracking-wider text-[oklch(0.45_0_0)]">Institucional</span>
            </a>
          </div>
        </div>

        <div className="container mx-auto px-4 sm:px-6 lg:px-8 pt-12 pb-12">
          <Card className="w-full max-w-xl mx-auto border-2 border-[oklch(0.88_0_0)] shadow-lg">
            <CardHeader className="bg-gradient-to-b from-[oklch(0.98_0_0)] to-white border-b border-[oklch(0.88_0_0)]">
              <CardTitle className="text-2xl text-[oklch(0.15_0_0)]">Carregando seus dados...</CardTitle>
              <CardDescription className="text-base text-[oklch(0.45_0_0)]">
                Só um instante.
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="text-sm text-[oklch(0.45_0_0)]">{roleProfileLoading ? "Buscando perfil..." : "Preparando..."}</div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // If user is authenticated, keep them in the institutional site.
  // If role is missing (OAuth path after we fix role trigger), allow completing it here.
  if (!isLoading && isAuthenticated && role && needsCompletion) {
    return (
      <div className="min-h-screen bg-mesh-gradient">
        {/* Header with Logo */}
        <div className="sticky top-0 z-50 bg-white/90 backdrop-blur-md border-b border-[oklch(0.88_0_0)]">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
            <a href="/" className="flex items-center gap-2">
              <span className="font-black text-2xl bg-gradient-to-r from-[oklch(0.15_0_0)] to-[oklch(0.55_0.25_264)] bg-clip-text text-transparent" style={{ fontFamily: "'Zen Dots', cursive" }}>
                FLUX
              </span>
              <span className="text-xs font-bold uppercase tracking-wider text-[oklch(0.45_0_0)]">Institucional</span>
            </a>
            <Button variant="ghost" onClick={() => setLocation("/")} className="text-sm font-semibold text-[oklch(0.45_0_0)] hover:text-[oklch(0.15_0_0)]">
              Voltar
            </Button>
          </div>
        </div>

        <div className="container mx-auto px-4 sm:px-6 lg:px-8 pt-12 pb-12">
          <Card className="w-full max-w-2xl mx-auto border-2 border-[oklch(0.88_0_0)] shadow-lg">
            <CardHeader className="bg-gradient-to-b from-[oklch(0.98_0_0)] to-white border-b border-[oklch(0.88_0_0)]">
              <CardTitle className="text-2xl text-[oklch(0.15_0_0)]">Complete seu cadastro</CardTitle>
              <CardDescription className="text-base text-[oklch(0.45_0_0)]">
                Precisamos dos dados abaixo para associar sua assinatura ao tipo de conta {role === "company" ? "Empresa" : "Entregador"}.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 pt-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="completion-name">Nome *</Label>
                  <Input
                    id="completion-name"
                    name="completion-name"
                    value={completionName}
                    onChange={(e) => setCompletionName(e.target.value)}
                    placeholder="Seu nome"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="completion-phone">Telefone *</Label>
                  <Input
                    id="completion-phone"
                    name="completion-phone"
                    value={completionPhone}
                    onChange={(e) => setCompletionPhone(formatPhone(e.target.value))}
                    placeholder="(DDD) 99999-9999"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="completion-state">Estado</Label>
                  <Input id="completion-state" name="completion-state" value={completionState} disabled />
                </div>
                <div className="space-y-2">
                  <Label id="completion-city-label">Cidade *</Label>
                  <Select value={completionCity} onValueChange={setCompletionCity} required>
                    <SelectTrigger id="completion-city" name="completion-city" aria-labelledby="completion-city-label">
                      <SelectValue placeholder="Selecione a cidade" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Rio Verde">Rio Verde</SelectItem>
                      <SelectItem value="Bom Jesus de Goiás">Bom Jesus de Goiás</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {role === "company" && (
                <div className="space-y-3">
                  <div className="space-y-2">
                    <Label htmlFor="completion-company-name">Nome da Empresa *</Label>
                    <Input
                      id="completion-company-name"
                      name="completion-company-name"
                      value={completionCompanyName}
                      onChange={(e) => setCompletionCompanyName(e.target.value)}
                      placeholder="Ex: Flux Logística LTDA"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="completion-company-cnpj">CNPJ *</Label>
                    <Input
                      id="completion-company-cnpj"
                      name="completion-company-cnpj"
                      value={completionCnpj}
                      onChange={(e) => setCompletionCnpj(formatCnpj(e.target.value))}
                      placeholder="00.000.000/0000-00"
                    />
                  </div>
                </div>
              )}

              {role === "driver" && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label id="completion-vehicle-type-label">Tipo de veículo *</Label>
                    <Select value={completionVehicleType} onValueChange={(v) => setCompletionVehicleType(v as any)}>
                      <SelectTrigger aria-labelledby="completion-vehicle-type-label">
                        <SelectValue placeholder="Selecione" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="moto">Moto</SelectItem>
                        <SelectItem value="car">Carro</SelectItem>
                        <SelectItem value="bike">Bicicleta</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="completion-vehicle-model">Modelo do veículo *</Label>
                    <Input
                      id="completion-vehicle-model"
                      name="completion-vehicle-model"
                      value={completionVehicleModel}
                      onChange={(e) => setCompletionVehicleModel(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="completion-plate">Placa *</Label>
                    <Input
                      id="completion-plate"
                      name="completion-plate"
                      value={completionPlate}
                      onChange={(e) => setCompletionPlate(formatPlate(e.target.value))}
                      placeholder="ABC-1234"
                    />
                  </div>
                </div>
              )}

              <div className="flex flex-col gap-3 pt-2">
                <Button
                  className="w-full font-bold text-base py-5 bg-[oklch(0.15_0_0)] text-white hover:bg-[oklch(0.25_0_0)]"
                  disabled={completionBusy || roleProfileLoading}
                  onClick={() => void handleCompleteProfile()}
                >
                  {completionBusy ? "Salvando..." : "Salvar e continuar"}
                </Button>
                <Button
                  variant="outline"
                  className="w-full font-bold border-2 border-[oklch(0.15_0_0)] text-[oklch(0.15_0_0)] hover:bg-[oklch(0.15_0_0)] hover:text-white"
                  onClick={() => setLocation("/")}
                >
                  Voltar
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (!isLoading && isAuthenticated && role) {
    const hasPending = !!getPendingPlan();
    return (
      <div className="min-h-screen bg-mesh-gradient">
        {/* Header with Logo */}
        <div className="sticky top-0 z-50 bg-white/90 backdrop-blur-md border-b border-[oklch(0.88_0_0)]">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
            <a href="/" className="flex items-center gap-2">
              <span className="font-black text-2xl bg-gradient-to-r from-[oklch(0.15_0_0)] to-[oklch(0.55_0.25_264)] bg-clip-text text-transparent" style={{ fontFamily: "'Zen Dots', cursive" }}>
                FLUX
              </span>
              <span className="text-xs font-bold uppercase tracking-wider text-[oklch(0.45_0_0)]">Institucional</span>
            </a>
            <Button variant="ghost" onClick={() => setLocation("/")} className="text-sm font-semibold text-[oklch(0.45_0_0)] hover:text-[oklch(0.15_0_0)]">
              Voltar
            </Button>
          </div>
        </div>

        <div className="container mx-auto px-4 sm:px-6 lg:px-8 pt-12 pb-12">
          <Card className="w-full max-w-lg mx-auto border-2 border-[oklch(0.88_0_0)] shadow-lg">
          <CardHeader className="bg-gradient-to-b from-[oklch(0.98_0_0)] to-white border-b border-[oklch(0.88_0_0)]">
            <CardTitle className="text-2xl text-[oklch(0.15_0_0)]">Você já está conectado</CardTitle>
            <CardDescription className="text-base text-[oklch(0.45_0_0)]">
              {displayName ? `Olá, ${displayName}.` : "Você já está autenticado."}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 pt-6">
            {hasPending && (
              <Button className="w-full font-bold text-base py-5 bg-[oklch(0.55_0.25_264)] text-white hover:bg-[oklch(0.45_0.25_264)] flex items-center justify-center gap-2" disabled={checkoutBusy} onClick={() => void startCheckoutIfPending()}>
                <CreditCard className="w-5 h-5" />
                {checkoutBusy ? "Iniciando pagamento..." : "Continuar compra"}
              </Button>
            )}
            <Button variant="outline" className="w-full font-bold text-base py-5 border-2 border-[oklch(0.15_0_0)] text-[oklch(0.15_0_0)] hover:bg-[oklch(0.15_0_0)] hover:text-white flex items-center justify-center gap-2" onClick={() => setLocation("/plano")}>
              <FileText className="w-5 h-5" />
              Ver Plano Atual
            </Button>
            <Button variant="outline" className="w-full font-bold text-base py-5 border-2 border-[oklch(0.15_0_0)] text-[oklch(0.15_0_0)] hover:bg-[oklch(0.15_0_0)] hover:text-white flex items-center justify-center gap-2" onClick={() => setLocation("/conta")}>
              <UserCircle className="w-5 h-5" />
              Informações da Conta
            </Button>
            <Button className="w-full font-bold text-base py-5 bg-[oklch(0.15_0_0)] text-white hover:bg-[oklch(0.25_0_0)] flex items-center justify-center gap-2" onClick={() => setLocation("/")}>
              <ArrowLeft className="w-5 h-5" />
              Voltar ao site
            </Button>
          </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (!isLoading && isAuthenticated && !role) {
    return (
      <div className="min-h-screen bg-mesh-gradient">
        {/* Header with Logo */}
        <div className="sticky top-0 z-50 bg-white/90 backdrop-blur-md border-b border-[oklch(0.88_0_0)]">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
            <a href="/" className="flex items-center gap-2">
              <span className="font-black text-2xl bg-gradient-to-r from-[oklch(0.15_0_0)] to-[oklch(0.55_0.25_264)] bg-clip-text text-transparent" style={{ fontFamily: "'Zen Dots', cursive" }}>
                FLUX
              </span>
              <span className="text-xs font-bold uppercase tracking-wider text-[oklch(0.45_0_0)]">Institucional</span>
            </a>
          </div>
        </div>

        <div className="container mx-auto px-4 sm:px-6 lg:px-8 pt-12 pb-12">
          <Card className="w-full max-w-lg mx-auto border-2 border-[oklch(0.88_0_0)] shadow-lg">
          <CardHeader className="bg-gradient-to-b from-[oklch(0.98_0_0)] to-white border-b border-[oklch(0.88_0_0)]">
            <CardTitle className="text-2xl text-[oklch(0.15_0_0)]">Escolha o tipo da sua conta</CardTitle>
            <CardDescription className="text-base text-[oklch(0.45_0_0)]">
              {getPendingPlan() ? `Baseado no plano "${getPendingPlan()}", selecione seu tipo de conta:` : "Isso é necessário para associar sua compra ao tipo correto (Empresa ou Entregador)."}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 pt-6">
            {getPendingPlan() && (
              <div className="p-3 rounded-lg bg-blue-50 border-2 border-blue-200 flex items-start gap-2">
                <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-blue-900">
                  <p className="font-semibold">Plano Selecionado</p>
                  <p>Você escolheu o plano <span className="font-bold">{getPendingPlan()}</span> na página anterior.</p>
                </div>
              </div>
            )}
            <RadioGroup value={signupRole} onValueChange={(v) => setSignupRole(v as any)} className="space-y-3">
              <div className={`flex items-center space-x-3 p-3 rounded-lg border-2 cursor-pointer transition-all ${signupRole === "company" ? "border-[oklch(0.55_0.25_264)] bg-blue-50" : "border-[oklch(0.88_0_0)] hover:border-[oklch(0.75_0_0)]"}`}>
                <RadioGroupItem value="company" id="role-company" className="text-[oklch(0.55_0.25_264)]" />
                <Building2 className="w-5 h-5 text-[oklch(0.55_0.25_264)]" />
                <div className="flex-1">
                  <Label htmlFor="role-company" className="cursor-pointer text-base font-semibold text-[oklch(0.15_0_0)]">Empresa</Label>
                  <p className="text-xs text-[oklch(0.45_0_0)]">Cadastro para empresas e negócios</p>
                </div>
              </div>
              <div className={`flex items-center space-x-3 p-3 rounded-lg border-2 cursor-pointer transition-all ${signupRole === "driver" ? "border-[oklch(0.75_0.30_145)] bg-orange-50" : "border-[oklch(0.88_0_0)] hover:border-[oklch(0.75_0_0)]"}`}>
                <RadioGroupItem value="driver" id="role-driver" className="text-[oklch(0.75_0.30_145)]" />
                <Bike className="w-5 h-5 text-[oklch(0.75_0.30_145)]" />
                <div className="flex-1">
                  <Label htmlFor="role-driver" className="cursor-pointer text-base font-semibold text-[oklch(0.15_0_0)]">Entregador</Label>
                  <p className="text-xs text-[oklch(0.45_0_0)]">Cadastro para motoristas e entregadores</p>
                </div>
              </div>
            </RadioGroup>

            <Button
              className="w-full font-bold text-base py-5 bg-[oklch(0.15_0_0)] text-white hover:bg-[oklch(0.25_0_0)] flex items-center justify-center gap-2"
              disabled={authBusy}
              onClick={async () => {
                setAuthBusy(true);
                try {
                  const res = await setMyRole(signupRole);
                  if (!res.success) {
                    toast.error(res.error ?? "Não foi possível concluir.");
                    return;
                  }
                  toast.success("Tipo de conta definido.");
                  await refresh();

                  // Não inicia checkout aqui: se faltar completar cadastro, mostramos a tela de completar.
                  // O auto-checkout roda sozinho quando role + cadastro completo.
                  if (!getPendingPlan()) setLocation("/");
                } finally {
                  setAuthBusy(false);
                }
              }}
            >
              <CheckCircle className="w-5 h-5" />
              {authBusy ? "Salvando..." : "Continuar"}
            </Button>
          </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-mesh-gradient">
      {/* Header with Logo */}
      <div className="sticky top-0 z-50 bg-white/90 backdrop-blur-md border-b border-[oklch(0.88_0_0)]">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <a href="/" className="flex items-center gap-2">
            <span className="font-brand text-2xl tracking-wider text-[oklch(0.15_0_0)]">
              FLUX
            </span>
            <span className="text-xs font-bold uppercase tracking-wider text-[oklch(0.45_0_0)]">Institucional</span>
          </a>
          <Button variant="ghost" onClick={() => setLocation("/")} className="text-sm font-semibold text-[oklch(0.45_0_0)] hover:text-[oklch(0.15_0_0)]">
            Voltar
          </Button>
        </div>
      </div>

      <div className="container mx-auto px-4 sm:px-6 lg:px-8 pt-8 pb-12">
        {/* Logo centralizada acima do card */}
        <div className="flex flex-col items-center justify-center mb-8">
          <img 
            src={logoTescuro} 
            alt="FLUX Logo" 
            className="w-32 h-32 sm:w-40 sm:h-40 md:w-48 md:h-48 object-contain"
          />
        </div>
        <Card className="w-full max-w-lg mx-auto border-2 border-[oklch(0.88_0_0)] shadow-lg">
        <CardHeader className="bg-gradient-to-b from-[oklch(0.98_0_0)] to-white border-b border-[oklch(0.88_0_0)]">
          <CardTitle className="text-2xl text-[oklch(0.15_0_0)]">Entrar na Sua Conta</CardTitle>
          <CardDescription className="text-base text-[oklch(0.45_0_0)]">
            Faça login para identificar o comprador e liberar o plano após o pagamento.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 pt-6">
          <Button
            className="w-full font-bold text-base py-5 bg-[oklch(0.15_0_0)] text-white hover:bg-[oklch(0.25_0_0)] transition-all flex items-center justify-center gap-2"
            disabled={authBusy}
            onClick={async () => {
              setAuthBusy(true);
              try {
                await signInWithGoogle();
              } catch (e: any) {
                toast.error(e?.message ?? "Não foi possível abrir o Google.");
              } finally {
                setAuthBusy(false);
              }
            }}
          >
            <UserCircle className="w-5 h-5" />
            {authBusy ? "Abrindo Google..." : "Continuar com Google"}
          </Button>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-[oklch(0.88_0_0)]"></span>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-white text-[oklch(0.60_0_0)] font-medium">Ou use email</span>
            </div>
          </div>

          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
            <TabsList className="grid w-full grid-cols-2 bg-[oklch(0.95_0_0)] border border-[oklch(0.88_0_0)]">
              <TabsTrigger value="login" className="font-bold">Email</TabsTrigger>
              <TabsTrigger value="signup" className="font-bold">Criar conta</TabsTrigger>
            </TabsList>

            <TabsContent value="login">
              <form
                className="space-y-3 pt-4"
                onSubmit={async (e) => {
                  e.preventDefault();
                  setAuthBusy(true);
                  const res = await signInWithPassword(loginEmail, loginPassword);
                  setAuthBusy(false);

                  if (!res.success) {
                    const errorMsg = res.error ?? "Erro ao fazer login.";
                    if (errorMsg.includes("Invalid login credentials") || errorMsg.includes("Invalid")) {
                      toast.error("Email ou senha inválidos. Verifique seus dados.");
                    } else if (errorMsg.includes("Email not confirmed")) {
                      toast.error("Confirme seu email antes de fazer login. Verifique sua caixa de entrada.");
                    } else {
                      toast.error(errorMsg);
                    }
                    return;
                  }

                  toast.success("Login realizado.");
                  const redirected = await startCheckoutIfPending();
                  if (!redirected) setLocation("/");
                }}
              >
                <div className="space-y-2">
                  <Label htmlFor="login-email">Email</Label>
                  <Input id="login-email" name="login-email" type="email" value={loginEmail} onChange={(e) => setLoginEmail(e.target.value)} required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="login-password">Senha</Label>
                  <Input id="login-password" name="login-password" type="password" value={loginPassword} onChange={(e) => setLoginPassword(e.target.value)} required />
                </div>

                <Button className="w-full" type="submit" disabled={authBusy}>
                  {authBusy ? "Entrando..." : "Entrar"}
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="signup">
              <div className="space-y-4">
                <div className="text-sm text-muted-foreground">
                  Cadastro em 3 etapas para garantir que seu plano seja ativado corretamente.
                </div>

                {signupStep === 1 && (
                  <div className="space-y-3">
                    <div className="space-y-2">
                      <Label htmlFor="signup-email">Email</Label>
                      <Input id="signup-email" name="signup-email" type="email" value={signupEmail} onChange={(e) => setSignupEmail(e.target.value)} required />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="signup-password">Senha</Label>
                      <Input id="signup-password" name="signup-password" type="password" value={signupPassword} onChange={(e) => setSignupPassword(e.target.value)} required />
                      <div className="text-xs text-muted-foreground">Mínimo de 6 caracteres.</div>
                    </div>

                    <Button
                      className="w-full"
                      disabled={authBusy}
                      onClick={() => {
                        if (signupPassword.length < 6) {
                          toast.error("A senha deve ter no mínimo 6 caracteres.");
                          return;
                        }
                        setSignupStep(2);
                      }}
                    >
                      Continuar
                    </Button>
                  </div>
                )}

                {signupStep === 2 && (
                  <div className="space-y-3">
                    <div className="space-y-2">
                      <Label htmlFor="signup-name">Nome *</Label>
                      <Input id="signup-name" name="signup-name" value={signupName} onChange={(e) => setSignupName(e.target.value)} required />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="signup-phone">Telefone *</Label>
                      <Input id="signup-phone" name="signup-phone" value={signupPhone} onChange={(e) => setSignupPhone(formatPhone(e.target.value))} placeholder="(DDD) 99999-9999" required />
                    </div>

                    <div className="flex flex-col gap-3">
                      <Button type="button" className="w-full font-bold" onClick={() => setSignupStep(3)}>
                        Continuar
                      </Button>
                      <Button type="button" variant="outline" className="w-full font-bold" onClick={() => setSignupStep(1)}>
                        Voltar
                      </Button>
                    </div>
                  </div>
                )}

                {signupStep === 3 && (
                  <form
                    className="space-y-3"
                    onSubmit={async (e) => {
                      e.preventDefault();

                      if (!signupName.trim()) {
                        toast.error("Informe seu nome.");
                        return;
                      }

                      if (!signupPhone.trim()) {
                        toast.error("Informe seu telefone.");
                        return;
                      }

                      if (signupPassword.length < 6) {
                        toast.error("A senha deve ter no mínimo 6 caracteres.");
                        return;
                      }

                      if (!signupCity) {
                        toast.error("Selecione uma cidade.");
                        return;
                      }

                      if (signupRole === "company") {
                        if (!signupCompanyName.trim()) {
                          toast.error("Informe o nome da empresa.");
                          return;
                        }
                        const formattedCnpj = formatCnpj(signupCnpj);
                        if (!isValidCnpj(formattedCnpj)) {
                          toast.error("Informe um CNPJ válido com 14 dígitos.");
                          return;
                        }
                      }

                      if (signupRole === "driver") {
                        if (!signupVehicleModel.trim()) {
                          toast.error("Informe o modelo do veículo.");
                          return;
                        }
                        const formattedPlate = formatPlate(signupPlate);
                        if (!isValidPlate(formattedPlate)) {
                          toast.error("Informe uma placa válida (ex: ABC1D23).");
                          return;
                        }
                      }

                      setAuthBusy(true);
                      try {
                        const res = await signUpWithPassword({
                          email: signupEmail,
                          password: signupPassword,
                          name: signupName,
                          role: signupRole,
                          phone: signupPhone,
                          state: signupState,
                          city: signupCity,
                          companyName: signupRole === "company" ? signupCompanyName : undefined,
                          cnpj: signupRole === "company" ? formatCnpj(signupCnpj) : undefined,
                          vehicleType: signupRole === "driver" ? signupVehicleType : undefined,
                          vehicleModel: signupRole === "driver" ? signupVehicleModel : undefined,
                          plate: signupRole === "driver" ? formatPlate(signupPlate) : undefined,
                        });

                        if (!res.success) {
                          const errorMsg = res.error ?? "Erro ao criar conta.";
                          if (errorMsg.includes("User already registered") || errorMsg.includes("already")) {
                            toast.error("Este email já está cadastrado. Faça login ou use outro email.");
                          } else if (errorMsg.includes("Password") || errorMsg.includes("senha")) {
                            toast.error("A senha deve ter pelo menos 6 caracteres.");
                          } else if (errorMsg.includes("Email")) {
                            toast.error("Email inválido. Verifique o formato.");
                          } else if (errorMsg.includes("confirm") || errorMsg.includes("verificação")) {
                            toast.info("Cadastro criado! Verifique seu email para confirmar a conta.");
                          } else {
                            toast.error(errorMsg);
                          }
                          return;
                        }

                        const { data: sessionData } = await supabase.auth.getSession();
                        const hasSession = !!sessionData.session;

                        if (!hasSession) {
                          toast.info("Cadastro criado! Verifique seu email para confirmar a conta.");
                        } else {
                          toast.success("Cadastro concluído.");
                        }

                        // After signup, always return to login tab; if session exists, the page will switch to authenticated UI.
                        setActiveTab("login");
                        setLoginEmail(signupEmail);
                        setLoginPassword("");
                        setSignupStep(1);

                        // Only attempt checkout when we have a session.
                        if (hasSession) {
                          void startCheckoutIfPending();
                        }
                      } finally {
                        setAuthBusy(false);
                      }
                    }}
                  >
                    <div className="space-y-2">
                      <Label>Tipo de conta</Label>
                      <RadioGroup value={signupRole} onValueChange={(v) => setSignupRole(v as any)} className="space-y-2">
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="company" id="signup-role-company" />
                          <Label htmlFor="signup-role-company">Empresa</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="driver" id="signup-role-driver" />
                          <Label htmlFor="signup-role-driver">Entregador</Label>
                        </div>
                      </RadioGroup>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="space-y-2">
                        <Label htmlFor="signup-state">Estado</Label>
                        <Input id="signup-state" name="signup-state" value={signupState} disabled placeholder="GO" />
                      </div>
                      <div className="space-y-2">
                        <Label id="signup-city-label">Cidade *</Label>
                        <Select value={signupCity} onValueChange={setSignupCity} required>
                          <SelectTrigger id="signup-city" name="signup-city" aria-labelledby="signup-city-label">
                            <SelectValue placeholder="Selecione a cidade" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Rio Verde">Rio Verde</SelectItem>
                            <SelectItem value="Bom Jesus de Goiás">Bom Jesus de Goiás</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    {signupRole === "company" && (
                      <div className="space-y-3">
                        <div className="space-y-2">
                          <Label htmlFor="signup-company-name">Nome da Empresa *</Label>
                          <Input id="signup-company-name" name="signup-company-name" value={signupCompanyName} onChange={(e) => setSignupCompanyName(e.target.value)} required />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="signup-cnpj">CNPJ *</Label>
                          <Input id="signup-cnpj" name="signup-cnpj" value={signupCnpj} onChange={(e) => setSignupCnpj(formatCnpj(e.target.value))} placeholder="00.000.000/0000-00" required />
                        </div>
                      </div>
                    )}

                    {signupRole === "driver" && (
                      <div className="space-y-3">
                        <div className="space-y-2">
                          <Label>Tipo de veículo</Label>
                          <RadioGroup value={signupVehicleType} onValueChange={(v) => setSignupVehicleType(v as any)} className="space-y-2">
                            <div className="flex items-center space-x-2">
                              <RadioGroupItem value="moto" id="vehicle-moto" />
                              <Label htmlFor="vehicle-moto">Moto</Label>
                            </div>
                            <div className="flex items-center space-x-2">
                              <RadioGroupItem value="car" id="vehicle-car" />
                              <Label htmlFor="vehicle-car">Carro</Label>
                            </div>
                            <div className="flex items-center space-x-2">
                              <RadioGroupItem value="bike" id="vehicle-bike" />
                              <Label htmlFor="vehicle-bike">Bike</Label>
                            </div>
                          </RadioGroup>
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="signup-vehicle-model">Modelo do veículo</Label>
                          <Input id="signup-vehicle-model" name="signup-vehicle-model" value={signupVehicleModel} onChange={(e) => setSignupVehicleModel(e.target.value)} placeholder="CG 160" required />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="signup-plate">Placa *</Label>
                          <Input id="signup-plate" name="signup-plate" value={signupPlate} onChange={(e) => setSignupPlate(formatPlate(e.target.value))} placeholder="ABC-1234" required />
                        </div>
                      </div>
                    )}

                    <div className="flex flex-col gap-3">
                      <Button className="w-full font-bold" type="submit" disabled={authBusy}>
                        {authBusy ? "Criando..." : "Concluir cadastro"}
                      </Button>
                      <Button type="button" variant="outline" className="w-full font-bold" onClick={() => setSignupStep(2)}>
                        Voltar
                      </Button>
                    </div>
                  </form>
                )}
              </div>
            </TabsContent>
          </Tabs>

          <Button variant="ghost" className="w-full" onClick={() => setLocation("/")}>Voltar</Button>
        </CardContent>
        </Card>
      </div>
    </div>
  );
}
