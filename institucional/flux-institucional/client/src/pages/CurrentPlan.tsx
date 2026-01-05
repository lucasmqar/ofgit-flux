import { useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { useAuth } from "@/contexts/AuthContext";
import { useLocation } from "wouter";
import NavigationHeader from "@/components/NavigationHeader";
import { Clock, CheckCircle, AlertCircle, CreditCard, Info, ArrowLeft } from "lucide-react";

function formatDateBr(date: Date) {
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

export default function CurrentPlan() {
  const [, setLocation] = useLocation();
  const { isLoading, isAuthenticated, credits, hasActiveCredits } = useAuth();

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
    return (
      <>
        <NavigationHeader />
        <div className="min-h-screen bg-white flex items-center justify-center p-6 pt-24">
        <Card className="w-full max-w-xl">
          <CardHeader>
            <CardTitle>Você não está logado</CardTitle>
            <CardDescription>Entre para ver o status do seu plano.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button className="w-full" onClick={() => setLocation("/login")}>Ir para Login</Button>
            <Button className="w-full" variant="outline" onClick={() => setLocation("/")}>Voltar</Button>
          </CardContent>
        </Card>
        </div>
      </>
    );
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
                    <CreditCard className="w-6 h-6" />
                  </div>
                  <div>
                    <CardTitle className="text-2xl md:text-3xl">Seu Plano Atual</CardTitle>
                    <CardDescription className="text-white/80">Status da sua assinatura e créditos</CardDescription>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="space-y-6 pt-8">
                {/* Status */}
                <div className="space-y-4">
                  <h3 className="text-lg font-bold text-[oklch(0.15_0_0)] flex items-center gap-2">
                    <div className="w-1 h-6 bg-[oklch(0.55_0.25_264)] rounded-full" />
                    Status
                  </h3>

                  <div className="pl-4">
                    {hasActiveCredits ? (
                      <div className="inline-flex items-center gap-3 px-4 py-3 rounded-lg bg-green-50 border-2 border-green-200">
                        <CheckCircle className="w-6 h-6 text-green-600" />
                        <div>
                          <p className="font-bold text-green-900">Ativo</p>
                          <p className="text-sm text-green-700">Você tem acesso ao sistema</p>
                        </div>
                      </div>
                    ) : (
                      <div className="inline-flex items-center gap-3 px-4 py-3 rounded-lg bg-yellow-50 border-2 border-yellow-200">
                        <AlertCircle className="w-6 h-6 text-yellow-600" />
                        <div>
                          <p className="font-bold text-yellow-900">Inativo</p>
                          <p className="text-sm text-yellow-700">Seu plano expirou</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <Separator className="my-4" />

                {/* Validade */}
                <div className="space-y-4">
                  <h3 className="text-lg font-bold text-[oklch(0.15_0_0)] flex items-center gap-2">
                    <div className="w-1 h-6 bg-[oklch(0.75_0.30_145)] rounded-full" />
                    Validade
                  </h3>

                  <div className="pl-4">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4 text-[oklch(0.55_0.25_264)]" />
                        <label className="text-sm font-semibold text-[oklch(0.45_0_0)]">Válido até</label>
                      </div>
                      <p className="text-lg font-medium text-[oklch(0.15_0_0)]">
                        {credits?.validUntil ? formatDateBr(credits.validUntil) : "-"}
                      </p>
                    </div>
                  </div>
                </div>

                <Separator className="my-6" />

                {/* Informação */}
                <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-4 flex items-start gap-3">
                  <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold text-blue-900">Informações sobre o plano</p>
                    <p className="text-sm text-blue-800 mt-1">
                      Seu plano fornece acesso ao sistema de logística FLUX. Quando expirar, você precisará renovar para continuar utilizando nossos serviços.
                    </p>
                  </div>
                </div>

                <div className="pt-4 flex flex-col sm:flex-row gap-3">
                  <Button 
                    onClick={() => setLocation("/#planos")}
                    className="flex-1 py-6 text-base font-bold bg-[oklch(0.55_0.25_264)] hover:bg-[oklch(0.45_0.25_264)] text-white"
                  >
                    <CreditCard className="w-4 h-4 mr-2" />
                    Renovar Plano
                  </Button>
                  <Button 
                    onClick={() => setLocation("/conta")}
                    variant="outline"
                    className="flex-1 py-6 text-base font-bold border-2"
                  >
                    Minha Conta
                  </Button>
                  <Button 
                    onClick={() => setLocation("/")}
                    variant="outline"
                    className="flex-1 py-6 text-base font-bold border-2"
                  >
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Voltar
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
