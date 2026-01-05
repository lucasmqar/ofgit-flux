import { useEffect, useMemo, useState } from "react";
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
import { createStripeCheckout } from "@/lib/supabase";

export default function Login() {
  const [, setLocation] = useLocation();
  const { isAuthenticated, isLoading, profile, role, signInWithGoogle, signInWithPassword, signUpWithPassword, setMyRole } = useAuth();

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
  const [signupVehicleType, setSignupVehicleType] = useState<"moto" | "car" | "bike">("moto");
  const [signupVehicleModel, setSignupVehicleModel] = useState("");
  const [signupPlate, setSignupPlate] = useState("");

  const [busy, setBusy] = useState(false);

  const getPendingPlan = () => window.sessionStorage.getItem("pendingCheckoutPlanKey");

  const startCheckoutIfPending = async (): Promise<boolean> => {
    const pending = getPendingPlan();
    if (!pending) return false;

    try {
      setBusy(true);
      const checkoutUrl = await createStripeCheckout(pending);
      // Only clear if we got a URL.
      window.sessionStorage.removeItem("pendingCheckoutPlanKey");
      window.location.href = checkoutUrl;
      return true;
    } catch (err) {
      const message = err instanceof Error ? err.message : "checkout_failed";
      toast.error(`Não foi possível iniciar o pagamento: ${message}`);
      return false;
    } finally {
      setBusy(false);
    }
  };

  const displayName = useMemo(() => {
    if (profile?.name) return profile.name;
    return null;
  }, [profile]);

  useEffect(() => {
    // If user returns from OAuth to /login and there is a pending plan,
    // continue straight to Stripe as soon as the user has a role.
    if (isLoading) return;
    if (!isAuthenticated) return;
    if (!role) return;

    void startCheckoutIfPending();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoading, isAuthenticated, role]);

  // If user is authenticated, keep them in the institutional site.
  // If role is missing (OAuth path after we fix role trigger), allow completing it here.
  if (!isLoading && isAuthenticated && role) {
    const hasPending = !!getPendingPlan();
    return (
      <div className="min-h-screen bg-white">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 pt-24 pb-12">
          <Card className="w-full max-w-lg mx-auto">
          <CardHeader>
            <CardTitle>Você já está conectado</CardTitle>
            <CardDescription>
              {displayName ? `Olá, ${displayName}.` : "Você já está autenticado."}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {hasPending && (
              <Button className="w-full" disabled={busy} onClick={() => void startCheckoutIfPending()}>
                {busy ? "Iniciando pagamento..." : "Continuar compra"}
              </Button>
            )}
            <Button className="w-full" onClick={() => setLocation("/")}>Voltar ao site</Button>
            <Button className="w-full" variant="outline" onClick={() => setLocation("/plano")}>Ver Plano Atual</Button>
            <Button className="w-full" variant="outline" onClick={() => setLocation("/conta")}>Informações da Conta</Button>
          </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (!isLoading && isAuthenticated && !role) {
    return (
      <div className="min-h-screen bg-white">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 pt-24 pb-12">
          <Card className="w-full max-w-lg mx-auto">
          <CardHeader>
            <CardTitle>Escolha o tipo da sua conta</CardTitle>
            <CardDescription>
              Isso é necessário para associar sua compra ao tipo correto (Empresa ou Entregador).
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <RadioGroup value={signupRole} onValueChange={(v) => setSignupRole(v as any)} className="space-y-2">
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="company" id="role-company" />
                <Label htmlFor="role-company">Empresa</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="driver" id="role-driver" />
                <Label htmlFor="role-driver">Entregador</Label>
              </div>
            </RadioGroup>

            <Button
              className="w-full"
              disabled={busy}
              onClick={async () => {
                setBusy(true);
                const res = await setMyRole(signupRole);
                setBusy(false);
                if (!res.success) {
                  toast.error(res.error ?? "Não foi possível concluir.");
                  return;
                }
                toast.success("Tipo de conta definido.");
                const redirected = await startCheckoutIfPending();
                if (!redirected) setLocation("/");
              }}
            >
              {busy ? "Salvando..." : "Continuar"}
            </Button>
          </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 pt-24 pb-12">
        <Card className="w-full max-w-lg mx-auto">
        <CardHeader>
          <CardTitle>Entrar</CardTitle>
          <CardDescription>
            Faça login para identificar o comprador e liberar o plano após o pagamento.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button
            className="w-full"
            variant="outline"
            disabled={busy || isLoading}
            onClick={async () => {
              try {
                setBusy(true);
                await signInWithGoogle();
              } catch (e: any) {
                toast.error(e?.message ?? "Não foi possível abrir o Google.");
                setBusy(false);
              }
            }}
          >
            Continuar com Google
          </Button>

          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="login">Email</TabsTrigger>
              <TabsTrigger value="signup">Criar conta</TabsTrigger>
            </TabsList>

            <TabsContent value="login">
              <form
                className="space-y-3"
                onSubmit={async (e) => {
                  e.preventDefault();
                  setBusy(true);
                  const res = await signInWithPassword(loginEmail, loginPassword);
                  setBusy(false);

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
                  <Input id="login-email" type="email" value={loginEmail} onChange={(e) => setLoginEmail(e.target.value)} required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="login-password">Senha</Label>
                  <Input id="login-password" type="password" value={loginPassword} onChange={(e) => setLoginPassword(e.target.value)} required />
                </div>

                <Button className="w-full" type="submit" disabled={busy}>
                  {busy ? "Entrando..." : "Entrar"}
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
                      <Input id="signup-email" type="email" value={signupEmail} onChange={(e) => setSignupEmail(e.target.value)} required />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="signup-password">Senha</Label>
                      <Input id="signup-password" type="password" value={signupPassword} onChange={(e) => setSignupPassword(e.target.value)} required />
                      <div className="text-xs text-muted-foreground">Mínimo de 6 caracteres.</div>
                    </div>

                    <Button
                      className="w-full"
                      disabled={busy}
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
                      <Label htmlFor="signup-name">Nome</Label>
                      <Input id="signup-name" value={signupName} onChange={(e) => setSignupName(e.target.value)} required />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="signup-phone">Telefone (opcional)</Label>
                      <Input id="signup-phone" value={signupPhone} onChange={(e) => setSignupPhone(e.target.value)} placeholder="(DDD) 99999-9999" />
                    </div>

                    <div className="flex flex-col md:flex-row gap-2">
                      <Button type="button" variant="outline" className="w-full" onClick={() => setSignupStep(1)}>
                        Voltar
                      </Button>
                      <Button type="button" className="w-full" onClick={() => setSignupStep(3)}>
                        Continuar
                      </Button>
                    </div>
                  </div>
                )}

                {signupStep === 3 && (
                  <form
                    className="space-y-3"
                    onSubmit={async (e) => {
                      e.preventDefault();

                      if (signupPassword.length < 6) {
                        toast.error("A senha deve ter no mínimo 6 caracteres.");
                        return;
                      }

                      if (!signupCity) {
                        toast.error("Selecione uma cidade.");
                        return;
                      }

                      setBusy(true);
                      const res = await signUpWithPassword({
                        email: signupEmail,
                        password: signupPassword,
                        name: signupName,
                        role: signupRole,
                        phone: signupPhone || undefined,
                        state: signupState,
                        city: signupCity,
                        companyName: signupRole === "company" ? signupCompanyName : undefined,
                        vehicleType: signupRole === "driver" ? signupVehicleType : undefined,
                        vehicleModel: signupRole === "driver" ? signupVehicleModel : undefined,
                        plate: signupRole === "driver" ? signupPlate : undefined,
                      });
                      setBusy(false);

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

                      toast.success("Cadastro concluído.");

                      // If user was created without session (email confirmation enabled), fall back to login tab.
                      setActiveTab("login");
                      setLoginEmail(signupEmail);
                      setLoginPassword("");
                      setSignupStep(1);

                      // If there is a pending checkout and we already have a session, continue.
                      await startCheckoutIfPending();
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
                        <Input id="signup-state" value={signupState} disabled placeholder="GO" />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="signup-city">Cidade *</Label>
                        <Select value={signupCity} onValueChange={setSignupCity} required>
                          <SelectTrigger>
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
                      <div className="space-y-2">
                        <Label htmlFor="signup-company-name">Nome da Empresa</Label>
                        <Input id="signup-company-name" value={signupCompanyName} onChange={(e) => setSignupCompanyName(e.target.value)} required />
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
                          <Input id="signup-vehicle-model" value={signupVehicleModel} onChange={(e) => setSignupVehicleModel(e.target.value)} placeholder="CG 160" required />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="signup-plate">Placa</Label>
                          <Input id="signup-plate" value={signupPlate} onChange={(e) => setSignupPlate(e.target.value)} placeholder="ABC1D23" required />
                        </div>
                      </div>
                    )}

                    <div className="flex flex-col md:flex-row gap-2">
                      <Button type="button" variant="outline" className="w-full" onClick={() => setSignupStep(2)}>
                        Voltar
                      </Button>
                      <Button className="w-full" type="submit" disabled={busy}>
                        {busy ? "Criando..." : "Concluir cadastro"}
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
