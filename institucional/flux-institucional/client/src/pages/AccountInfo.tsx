import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";
import { useLocation } from "wouter";
import NavigationHeader from "@/components/NavigationHeader";
import { User, Mail, Phone, MapPin, Building2, Bike, Car, AlertCircle, FileText, CreditCard, ArrowLeft } from "lucide-react";

export default function AccountInfo() {
  const [, setLocation] = useLocation();
  const { isLoading, isAuthenticated, profile, supabaseUser, role } = useAuth();

  const [roleProfile, setRoleProfile] = useState<any | null>(null);
  const [roleProfileLoading, setRoleProfileLoading] = useState(false);

  useEffect(() => {
    let mounted = true;

    const run = async () => {
      // Se não está autenticado ou não tem role, seta loading false e retorna
      if (!isAuthenticated) {
        if (mounted) setRoleProfileLoading(false);
        return;
      }
      
      if (!role) {
        if (mounted) setRoleProfileLoading(false);
        return;
      }
      
      if (role !== "company" && role !== "driver") {
        if (mounted) setRoleProfileLoading(false);
        return;
      }
      
      setRoleProfileLoading(true);

      try {
        if (role === "company") {
          const { data } = await supabase
            .from("company_profiles")
            .select("company_name, state, city")
            .eq("user_id", supabaseUser?.id ?? "")
            .maybeSingle();
          if (mounted) setRoleProfile(data ?? null);
        }

        if (role === "driver") {
          const { data } = await supabase
            .from("driver_profiles")
            .select("vehicle_type, vehicle_model, plate, state, city")
            .eq("user_id", supabaseUser?.id ?? "")
            .maybeSingle();
          if (mounted) setRoleProfile(data ?? null);
        }
      } finally {
        if (mounted) setRoleProfileLoading(false);
      }
    };

    void run();
    return () => {
      mounted = false;
    };
  }, [isAuthenticated, role, supabaseUser?.id]);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      setLocation("/login");
    }
  }, [isLoading, isAuthenticated, setLocation]);

  if (isLoading) {
    return (
      <>
        <NavigationHeader />
        <div className="min-h-screen bg-white flex items-center justify-center p-6 pt-24">
          Carregando...
        </div>
      </>
    );
  }

  if (!isAuthenticated) {
    return null; // Will redirect via useEffect
  }

  return (
    <>
      <NavigationHeader />
      <div className="min-h-screen bg-mesh-gradient pt-20">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 pt-12 pb-12">
          <div className="w-full max-w-3xl mx-auto">
            <Card className="border-2 border-[oklch(0.88_0_0)] shadow-lg overflow-hidden">
              <CardHeader className="bg-gradient-to-r from-[oklch(0.55_0.25_264)] to-[oklch(0.75_0.20_95)] text-white border-b-2 border-[oklch(0.88_0_0)]">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-white/20 rounded-lg backdrop-blur-sm">
                    <User className="w-6 h-6" />
                  </div>
                  <div>
                    <CardTitle className="text-2xl md:text-3xl">Informações da Conta</CardTitle>
                    <CardDescription className="text-white/80">Seus dados pessoais e perfil da assinatura</CardDescription>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="space-y-6 pt-8">
                {/* Seção: Dados Pessoais */}
                <div className="space-y-4">
                  <h3 className="text-lg font-bold text-[oklch(0.15_0_0)] flex items-center gap-2">
                    <div className="w-1 h-6 bg-[oklch(0.55_0.25_264)] rounded-full" />
                    Dados Pessoais
                  </h3>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pl-4">
                    {/* Nome */}
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <User className="w-4 h-4 text-[oklch(0.55_0.25_264)]" />
                        <label className="text-sm font-semibold text-[oklch(0.45_0_0)]">Nome</label>
                      </div>
                      <p className="text-lg font-medium text-[oklch(0.15_0_0)]">
                        {profile?.name ?? (supabaseUser?.user_metadata?.name as string | undefined) ?? "-"}
                      </p>
                    </div>

                    {/* Email */}
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <Mail className="w-4 h-4 text-[oklch(0.55_0.25_264)]" />
                        <label className="text-sm font-semibold text-[oklch(0.45_0_0)]">Email</label>
                      </div>
                      <p className="text-lg font-medium text-[oklch(0.15_0_0)]">
                        {profile?.email ?? supabaseUser?.email ?? "-"}
                      </p>
                    </div>

                    {/* Telefone */}
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <Phone className="w-4 h-4 text-[oklch(0.55_0.25_264)]" />
                        <label className="text-sm font-semibold text-[oklch(0.45_0_0)]">Telefone</label>
                      </div>
                      <p className="text-lg font-medium text-[oklch(0.15_0_0)]">
                        {profile?.phone ?? "-"}
                      </p>
                    </div>

                    {/* Localização */}
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <MapPin className="w-4 h-4 text-[oklch(0.55_0.25_264)]" />
                        <label className="text-sm font-semibold text-[oklch(0.45_0_0)]">Cidade / Estado</label>
                      </div>
                      <p className="text-lg font-medium text-[oklch(0.15_0_0)]">
                        {roleProfileLoading 
                          ? "Carregando..." 
                          : `${roleProfile?.city ?? "-"} / ${roleProfile?.state ?? "-"}`}
                      </p>
                    </div>
                  </div>
                </div>

                <Separator className="my-4" />

                {/* Seção: Tipo de Conta */}
                <div className="space-y-4">
                  <h3 className="text-lg font-bold text-[oklch(0.15_0_0)] flex items-center gap-2">
                    <div className="w-1 h-6 bg-[oklch(0.75_0.30_145)] rounded-full" />
                    Tipo de Conta
                  </h3>

                  <div className="pl-4">
                    <div className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[oklch(0.15_0_0)] text-white">
                      {role === "company" && (
                        <>
                          <Building2 className="w-5 h-5" />
                          <span className="font-bold">Empresa</span>
                        </>
                      )}
                      {role === "driver" && (
                        <>
                          <Bike className="w-5 h-5" />
                          <span className="font-bold">Entregador</span>
                        </>
                      )}
                      {!role && (
                        <>
                          <AlertCircle className="w-5 h-5" />
                          <span className="font-bold">Não definido</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                <Separator className="my-4" />

                {/* Seção: Dados Específicos por Role */}
                {role === "company" && (
                  <div className="space-y-4">
                    <h3 className="text-lg font-bold text-[oklch(0.15_0_0)] flex items-center gap-2">
                      <div className="w-1 h-6 bg-[oklch(0.55_0.25_264)] rounded-full" />
                      Dados da Empresa
                    </h3>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pl-4">
                      {/* Nome da Empresa */}
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <Building2 className="w-4 h-4 text-[oklch(0.55_0.25_264)]" />
                          <label className="text-sm font-semibold text-[oklch(0.45_0_0)]">Razão Social</label>
                        </div>
                        <p className="text-lg font-medium text-[oklch(0.15_0_0)]">
                          {roleProfile?.company_name ?? "-"}
                        </p>
                      </div>

                      {/* CNPJ */}
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <FileText className="w-4 h-4 text-[oklch(0.55_0.25_264)]" />
                          <label className="text-sm font-semibold text-[oklch(0.45_0_0)]">CNPJ</label>
                        </div>
                        <p className="text-lg font-medium text-[oklch(0.15_0_0)] font-mono">
                          {roleProfile?.cnpj ? `${roleProfile.cnpj.slice(0,2)}.${roleProfile.cnpj.slice(2,5)}.${roleProfile.cnpj.slice(5,8)}/${roleProfile.cnpj.slice(8,12)}-${roleProfile.cnpj.slice(12)}` : "-"}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {role === "driver" && (
                  <div className="space-y-4">
                    <h3 className="text-lg font-bold text-[oklch(0.15_0_0)] flex items-center gap-2">
                      <div className="w-1 h-6 bg-[oklch(0.75_0.30_145)] rounded-full" />
                      Dados do Veículo
                    </h3>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pl-4">
                      {/* Tipo de Veículo */}
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <Bike className="w-4 h-4 text-[oklch(0.75_0.30_145)]" />
                          <label className="text-sm font-semibold text-[oklch(0.45_0_0)]">Tipo</label>
                        </div>
                        <p className="text-lg font-medium text-[oklch(0.15_0_0)] capitalize">
                          {roleProfile?.vehicle_type === 'moto' ? 'Moto' : roleProfile?.vehicle_type === 'car' ? 'Carro' : roleProfile?.vehicle_type === 'bike' ? 'Bicicleta' : "-"}
                        </p>
                      </div>

                      {/* Modelo */}
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <Car className="w-4 h-4 text-[oklch(0.75_0.30_145)]" />
                          <label className="text-sm font-semibold text-[oklch(0.45_0_0)]">Modelo</label>
                        </div>
                        <p className="text-lg font-medium text-[oklch(0.15_0_0)]">
                          {roleProfile?.vehicle_model ?? "-"}
                        </p>
                      </div>

                      {/* Placa */}
                      <div className="space-y-2 md:col-span-2">
                        <label className="text-sm font-semibold text-[oklch(0.45_0_0)]">Placa</label>
                        <p className="text-lg font-medium text-[oklch(0.15_0_0)] font-mono">
                          {roleProfile?.plate ? `${roleProfile.plate.slice(0,3)}-${roleProfile.plate.slice(3)}` : "-"}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                <Separator className="my-6" />

                {/* Botões de Ação */}
                <div className="flex flex-col sm:flex-row gap-3">
                  <Button 
                    onClick={() => setLocation("/plano")}
                    className="flex-1 py-6 text-base font-bold bg-[oklch(0.55_0.25_264)] hover:bg-[oklch(0.45_0.25_264)] text-white"
                  >
                    <CreditCard className="w-4 h-4 mr-2" />
                    Ver Plano Atual
                  </Button>
                  <Button 
                    onClick={() => setLocation("/")}
                    variant="outline"
                    className="flex-1 py-6 text-base font-bold border-2"
                  >
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Voltar ao Site
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </>
  );
}

