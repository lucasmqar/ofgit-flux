/**
 * FLUX - Site Institucional
 * Design: Neo-Brutalismo Tecnológico com Elementos Futuristas
 * - Contraste máximo entre neutros e acentos vibrantes
 * - Layout assimétrico com elementos flutuantes
 * - Gradientes mesh sutis em backgrounds neutros
 * - Glassmorphism e sombras profundas
 * - Animações fluidas com elastic easing
 */

import { useState, useEffect, useMemo } from 'react';
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";
import { 
  Zap, 
  TrendingUp, 
  Shield, 
  Smartphone, 
  BarChart3, 
  CheckCircle2, 
  ArrowRight, 
  Menu, 
  X,
  Store,
  Bike,
  Building2,
  Download,
  FileText,
  CreditCard,
  User,
  UserCircle,
  Mail,
  Phone,
  MapPin,
  Users,
  Sparkles,
  AlertCircle,
  PieChart,
  DollarSign,
  Target,
  LineChart
} from 'lucide-react';

export default function Home() {
  const [, setLocation] = useLocation();
  const [activeTab, setActiveTab] = useState<'empresa' | 'entregador'>('empresa');
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [checkoutLoadingPlanKey, setCheckoutLoadingPlanKey] = useState<string | null>(null);
  const { isAuthenticated, isLoading, signOut, profile, supabaseUser, role, hasActiveCredits } = useAuth();

  const [roleProfile, setRoleProfile] = useState<any | null>(null);
  const [roleProfileLoading, setRoleProfileLoading] = useState(false);

  // Get user data from auth context
  const userEmail = profile?.email ?? supabaseUser?.email ?? null;
  const userName = profile?.name ?? supabaseUser?.user_metadata?.full_name ?? "Usuário";
  const userAvatarUrl = (supabaseUser?.user_metadata?.avatar_url as string | undefined) ?? null;

  // Detect scroll for navbar background
  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 50);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    // Lightweight feedback when Stripe redirects back.
    const params = new URLSearchParams(window.location.search);
    if (params.get("checkout") === "success") {
      toast.success("Pagamento concluído. Acesse o app para usar seus créditos.");
    }
  }, []);

  const handleLogout = async () => {
    try {
      await signOut();
      // signOut already redirects to home
    } catch (error) {
      console.error("Logout error:", error);
      toast.error("Erro ao sair da conta");
    }
  };

  useEffect(() => {
    let mounted = true;

    const run = async () => {
      if (!isAuthenticated) {
        if (mounted) setRoleProfile(null);
        return;
      }

      if (!role || (role !== "company" && role !== "driver") || !supabaseUser?.id) {
        if (mounted) setRoleProfile(null);
        return;
      }

      setRoleProfileLoading(true);
      try {
        if (role === "company") {
          const { data } = await supabase
            .from("company_profiles")
            .select("company_name, state, city, cnpj")
            .eq("user_id", supabaseUser.id)
            .maybeSingle();
          if (mounted) setRoleProfile(data ?? null);
          return;
        }

        if (role === "driver") {
          const { data } = await supabase
            .from("driver_profiles")
            .select("vehicle_type, vehicle_model, plate, state, city")
            .eq("user_id", supabaseUser.id)
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

  const handleSubscribe = async (days: number) => {
    const roleKey = activeTab === "empresa" ? "company" : "driver";
    const planKey = `${roleKey}_${days}d`;

    setCheckoutLoadingPlanKey(planKey);

    // Always send the user through /login so we can validate/complete profile
    // before creating a Stripe Checkout session.
    window.sessionStorage.setItem("pendingCheckoutPlanKey", planKey);
    if (isAuthenticated && !role) {
      toast.error("Complete o cadastro antes de assinar.");
    }
    setLocation("/login");
  };

  // Dados dos planos
  const planosEmpresa = [
    { 
      nome: "Teste Rápido", 
      duracao: "15 dias", 
      dias: 15,
      preco: "189,90", 
      descricao: "Valide a demanda sem compromisso de longo prazo.",
      destaque: false,
      economia: null,
      vantagens: [
        "Pedidos Ilimitados",
        "0% de Taxas",
        "Relatórios Completos",
        "Suporte Básico",
        "Integração Direta"
      ]
    },
    { 
      nome: "Mensal", 
      duracao: "30 dias", 
      dias: 30,
      preco: "389,90", 
      descricao: "Flexibilidade total para seu negócio crescer.",
      destaque: false,
      economia: null,
      vantagens: [
        "Pedidos Ilimitados",
        "0% de Taxas",
        "Relatórios Completos",
        "Suporte Prioritário",
        "Integração Direta",
        "Análise de Performance"
      ]
    },
    { 
      nome: "Trimestral", 
      duracao: "3 meses", 
      dias: 90,
      preco: "999,90", 
      descricao: "Para operações consolidadas que buscam eficiência.",
      destaque: true,
      economia: "Economia de 14%",
      vantagens: [
        "Pedidos Ilimitados",
        "0% de Taxas",
        "Relatórios Completos",
        "Suporte Prioritário 24/7",
        "Integração Direta",
        "Análise de Performance",
        "Gestor Dedicado",
        "API Customizada"
      ]
    },
    { 
      nome: "Semestral", 
      duracao: "6 meses", 
      dias: 180,
      preco: "1.999,90", 
      descricao: "Máxima performance com o melhor custo-benefício.",
      destaque: false,
      economia: "Economia de 28%",
      vantagens: [
        "Pedidos Ilimitados",
        "0% de Taxas",
        "Relatórios Completos",
        "Suporte Prioritário 24/7",
        "Integração Direta",
        "Análise de Performance",
        "Gestor Dedicado",
        "API Customizada",
        "Consultoria Estratégica"
      ]
    },
  ];

  const planosEntregador = [
    { 
      nome: "Sprint", 
      duracao: "15 dias", 
      dias: 15,
      preco: "89,90", 
      descricao: "Comece a lucrar de verdade agora mesmo.",
      destaque: false,
      economia: null,
      vantagens: [
        "Pedidos Ilimitados",
        "100% do Valor",
        "Relatórios Mensais",
        "Suporte Básico",
        "Sem Ranking Injusto"
      ]
    },
    { 
      nome: "Mensal", 
      duracao: "30 dias", 
      dias: 30,
      preco: "169,90", 
      descricao: "Estabilidade para seus ganhos mensais.",
      destaque: true,
      economia: "Mais Popular",
      vantagens: [
        "Pedidos Ilimitados",
        "100% do Valor",
        "Relatórios Mensais",
        "Suporte Prioritário",
        "Sem Ranking Injusto",
        "Negociação Direta"
      ]
    },
    { 
      nome: "Trimestral", 
      duracao: "3 meses", 
      dias: 90,
      preco: "489,90", 
      descricao: "Foco total na rodagem sem preocupações.",
      destaque: false,
      economia: "Desconto de 13%",
      vantagens: [
        "Pedidos Ilimitados",
        "100% do Valor",
        "Relatórios Mensais",
        "Suporte Prioritário 24/7",
        "Sem Ranking Injusto",
        "Negociação Direta",
        "Bônus por Performance"
      ]
    },
    { 
      nome: "Semestral", 
      duracao: "6 meses", 
      dias: 180,
      preco: "899,90", 
      descricao: "Para profissionais de elite que pensam grande.",
      destaque: false,
      economia: "Max Lucro - 29% OFF",
      vantagens: [
        "Pedidos Ilimitados",
        "100% do Valor",
        "Relatórios Mensais",
        "Suporte Prioritário 24/7",
        "Sem Ranking Injusto",
        "Negociação Direta",
        "Bônus por Performance",
        "Acesso VIP a Oportunidades"
      ]
    },
  ];

  const planos = activeTab === 'empresa' ? planosEmpresa : planosEntregador;

  const economiaScenario = useMemo(() => {
    if (activeTab === "empresa") {
      return {
        faturamentoMensal: "R$ 10.000",
        taxaRange: "- R$ 1.500 a 2.000",
        voceFicaRange: "R$ 8.000 a 8.500",
        assinaturaFlux: "- R$ 389,90",
        voceFicaFlux: "R$ 9.610,10",
        economiaMensal: "R$ 1.110 a 1.610",
        economiaAnual: "Isso significa R$ 13.320 a 19.320 economizados por ano!",
        economiaLabel: "Por mês em sua empresa",
      };
    }

    // Entregadores: valores diferentes para evidenciar a troca de aba.
    return {
      faturamentoMensal: "R$ 5.000",
      taxaRange: "- R$ 750 a 1.000",
      voceFicaRange: "R$ 4.000 a 4.250",
      assinaturaFlux: "- R$ 169,90",
      voceFicaFlux: "R$ 4.830,10",
      economiaMensal: "R$ 500 a 800",
      economiaAnual: "Isso significa R$ 6.000 a 9.600 economizados por ano!",
      economiaLabel: "Por mês em seus ganhos",
    };
  }, [activeTab]);

  // Cálculo de economia
  const calcularEconomia = (preco: string, dias: number) => {
    const valor = parseFloat(preco.replace(',', '.'));
    const taxaMedia = 0.15; // 15% de taxa média de apps concorrentes
    const economiaTotal = (valor / (1 - taxaMedia)) * taxaMedia;
    return economiaTotal.toFixed(2);
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Header (mesmo estilo do login) */}
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

          {isAuthenticated ? (
            <div className="flex items-center gap-2">
              <Button variant="outline" className="border-2" onClick={() => setLocation("/conta")}>Editar conta</Button>
              <Button variant="destructive" onClick={handleLogout}>Sair</Button>
            </div>
          ) : (
            <Button className="bg-[oklch(0.15_0_0)] text-white hover:bg-[oklch(0.25_0_0)]" onClick={() => setLocation("/login")}>Acessar conta</Button>
          )}
        </div>
      </div>

      {/* Hero Section */}
      <section className="relative pt-40 pb-20 sm:pt-48 sm:pb-32 overflow-hidden bg-mesh-gradient">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="max-w-4xl mx-auto text-center">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/80 backdrop-blur-sm border-2 border-[oklch(0.88_0_0)] mb-8 shadow-lg">
              <Sparkles className="w-4 h-4 text-[oklch(0.75_0.30_145)]" />
              <span className="text-xs font-bold uppercase tracking-wider text-[oklch(0.15_0_0)]">
                Sistema Nº 1 para Logística Direta
              </span>
            </div>

            {/* Headline */}
            <h1 className="text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-black text-[oklch(0.15_0_0)] leading-[0.95] mb-6 tracking-tight">
              Adeus Taxas.<br />
              <span className="gradient-text">Lucro Real.</span>
            </h1>

            {/* Subheadline */}
            <p className="text-lg sm:text-xl md:text-2xl text-[oklch(0.35_0_0)] font-medium leading-relaxed mb-4 max-w-3xl mx-auto">
              Conectamos <strong className="text-[oklch(0.15_0_0)]">Empresas</strong> e <strong className="text-[oklch(0.15_0_0)]">Entregadores</strong> com pedidos <strong className="text-[oklch(0.55_0.25_264)]">ILIMITADOS</strong>.
            </p>
            
            <p className="text-base sm:text-lg text-[oklch(0.45_0_0)] mb-10 max-w-2xl mx-auto">
              Mantenha <strong className="text-[oklch(0.75_0.30_145)]">100%</strong> do seu faturamento. Controle total na sua mão.
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-12">
              <Button asChild size="lg" className="bg-[oklch(0.55_0.25_264)] text-white hover:bg-[oklch(0.45_0.25_264)] font-bold text-lg px-8 py-6 shadow-brutal hover:shadow-brutal-lg transition-all group">
                <a href="#">
                  Baixar Agora
                  <ArrowRight className="ml-2 group-hover:translate-x-1 transition-transform" />
                </a>
              </Button>
              <Button
                asChild
                size="lg"
                variant="outline"
                className="border-2 border-[oklch(0.15_0_0)] text-[oklch(0.15_0_0)] hover:bg-[oklch(0.15_0_0)] hover:text-white font-bold text-lg px-8 py-6 transition-all"
              >
                <a href="#planos">Ver Planos</a>
              </Button>
            </div>

            {/* Store Badges */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <a href="#" className="transition-transform hover:scale-105">
                <img 
                  src="https://upload.wikimedia.org/wikipedia/commons/3/3c/Download_on_the_App_Store_Badge.svg" 
                  alt="Download na App Store" 
                  className="h-12"
                />
              </a>
              <a href="#" className="transition-transform hover:scale-105">
                <img 
                  src="https://upload.wikimedia.org/wikipedia/commons/7/78/Google_Play_Store_badge_EN.svg" 
                  alt="Disponível no Google Play" 
                  className="h-12"
                />
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Status da conta (meio do layout) */}
      <section className="py-16 bg-white border-b border-[oklch(0.88_0_0)]">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-5xl mx-auto">
            <Card className="border-2 border-[oklch(0.88_0_0)] shadow-lg overflow-hidden">
              <CardHeader className="bg-gradient-to-b from-[oklch(0.98_0_0)] to-white border-b border-[oklch(0.88_0_0)]">
                <div className="flex items-start sm:items-center justify-between gap-4 flex-col sm:flex-row">
                  <div>
                    <CardTitle className="text-2xl text-[oklch(0.15_0_0)]">Status da conta</CardTitle>
                    <CardDescription className="text-base text-[oklch(0.45_0_0)]">
                      Login, cadastro e plano (bolinhas vermelho/verde)
                    </CardDescription>
                  </div>

                  <div className="flex gap-2">
                    {isAuthenticated ? (
                      <>
                        <Button variant="outline" className="border-2" onClick={() => setLocation("/conta")}>Editar conta</Button>
                        <Button variant="outline" className="border-2" onClick={() => setLocation("/plano")}>Ver plano</Button>
                        <Button variant="destructive" onClick={handleLogout}>Sair</Button>
                      </>
                    ) : (
                      <Button className="bg-[oklch(0.55_0.25_264)] text-white hover:bg-[oklch(0.45_0.25_264)]" onClick={() => setLocation("/login")}>
                        Entrar / Criar conta
                      </Button>
                    )}
                  </div>
                </div>
              </CardHeader>

              <CardContent className="pt-8 space-y-8">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="p-4 rounded-xl border-2 border-[oklch(0.88_0_0)] bg-white">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <UserCircle className="w-5 h-5 text-[oklch(0.55_0.25_264)]" />
                        <div className="font-bold text-[oklch(0.15_0_0)]">Login</div>
                      </div>
                      <span className={`w-3 h-3 rounded-full ${isAuthenticated ? "bg-[oklch(0.75_0.30_145)]" : "bg-destructive"}`} />
                    </div>
                    <div className="mt-2 text-sm text-[oklch(0.45_0_0)]">
                      {isLoading ? "Carregando..." : isAuthenticated ? "Conectado" : "Desconectado"}
                    </div>
                  </div>

                  <div className="p-4 rounded-xl border-2 border-[oklch(0.88_0_0)] bg-white">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <FileText className="w-5 h-5 text-[oklch(0.55_0.25_264)]" />
                        <div className="font-bold text-[oklch(0.15_0_0)]">Cadastro</div>
                      </div>
                      <span
                        className={`w-3 h-3 rounded-full ${
                          !isAuthenticated
                            ? "bg-destructive"
                            : !role
                              ? "bg-destructive"
                              : roleProfileLoading
                                ? "bg-destructive"
                                : profile?.name && profile?.phone && roleProfile
                                  ? "bg-[oklch(0.75_0.30_145)]"
                                  : "bg-destructive"
                        }`}
                      />
                    </div>
                    <div className="mt-2 text-sm text-[oklch(0.45_0_0)]">
                      {!isAuthenticated
                        ? "Precisa entrar"
                        : !role
                          ? "Escolher tipo de conta"
                          : roleProfileLoading
                            ? "Carregando dados..."
                            : profile?.name && profile?.phone && roleProfile
                              ? "Completo"
                              : "Dados pendentes"}
                    </div>
                  </div>

                  <div className="p-4 rounded-xl border-2 border-[oklch(0.88_0_0)] bg-white">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <CreditCard className="w-5 h-5 text-[oklch(0.55_0.25_264)]" />
                        <div className="font-bold text-[oklch(0.15_0_0)]">Plano</div>
                      </div>
                      <span className={`w-3 h-3 rounded-full ${isAuthenticated && hasActiveCredits ? "bg-[oklch(0.75_0.30_145)]" : "bg-destructive"}`} />
                    </div>
                    <div className="mt-2 text-sm text-[oklch(0.45_0_0)]">
                      {!isAuthenticated ? "Precisa entrar" : hasActiveCredits ? "Ativo" : "Precisa assinar"}
                    </div>
                  </div>
                </div>

                <Separator />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-3">
                    <div className="text-sm font-bold uppercase tracking-wider text-[oklch(0.45_0_0)]">Dados da conta</div>
                    <div className="space-y-2">
                      <div className="flex items-start gap-3">
                        <User className="w-4 h-4 mt-1 text-[oklch(0.55_0.25_264)]" />
                        <div>
                          <div className="text-xs font-semibold text-[oklch(0.45_0_0)]">Nome</div>
                          <div className="text-[oklch(0.15_0_0)] font-medium">{profile?.name ?? "-"}</div>
                        </div>
                      </div>
                      <div className="flex items-start gap-3">
                        <Mail className="w-4 h-4 mt-1 text-[oklch(0.55_0.25_264)]" />
                        <div>
                          <div className="text-xs font-semibold text-[oklch(0.45_0_0)]">Email</div>
                          <div className="text-[oklch(0.15_0_0)] font-medium">{profile?.email ?? supabaseUser?.email ?? "-"}</div>
                        </div>
                      </div>
                      <div className="flex items-start gap-3">
                        <Phone className="w-4 h-4 mt-1 text-[oklch(0.55_0.25_264)]" />
                        <div>
                          <div className="text-xs font-semibold text-[oklch(0.45_0_0)]">Telefone</div>
                          <div className="text-[oklch(0.15_0_0)] font-medium">{profile?.phone ?? "-"}</div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="text-sm font-bold uppercase tracking-wider text-[oklch(0.45_0_0)]">Dados do perfil</div>
                    <div className="space-y-2">
                      <div className="flex items-start gap-3">
                        <MapPin className="w-4 h-4 mt-1 text-[oklch(0.55_0.25_264)]" />
                        <div>
                          <div className="text-xs font-semibold text-[oklch(0.45_0_0)]">Cidade / Estado</div>
                          <div className="text-[oklch(0.15_0_0)] font-medium">
                            {roleProfileLoading ? "Carregando..." : `${roleProfile?.city ?? "-"} / ${roleProfile?.state ?? "-"}`}
                          </div>
                        </div>
                      </div>

                      {role === "company" && (
                        <div className="flex items-start gap-3">
                          <Building2 className="w-4 h-4 mt-1 text-[oklch(0.55_0.25_264)]" />
                          <div>
                            <div className="text-xs font-semibold text-[oklch(0.45_0_0)]">Empresa</div>
                            <div className="text-[oklch(0.15_0_0)] font-medium">{roleProfile?.company_name ?? "-"}</div>
                          </div>
                        </div>
                      )}

                      {role === "driver" && (
                        <div className="flex items-start gap-3">
                          <Bike className="w-4 h-4 mt-1 text-[oklch(0.75_0.30_145)]" />
                          <div>
                            <div className="text-xs font-semibold text-[oklch(0.45_0_0)]">Veículo</div>
                            <div className="text-[oklch(0.15_0_0)] font-medium">
                              {(roleProfile?.vehicle_model as string | undefined) ?? "-"}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {!isAuthenticated && (
                  <div className="rounded-xl border-2 border-[oklch(0.88_0_0)] bg-[oklch(0.98_0_0)] p-4 text-sm text-[oklch(0.45_0_0)]">
                    Entre para ver e editar seus dados, acompanhar seu plano e finalizar a assinatura.
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Sobre FLUX - Por que surgiu */}
      <section className="py-24 bg-[oklch(0.98_0_0)] border-y border-[oklch(0.88_0_0)]">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-4xl mx-auto">
            <div className="mb-12">
              <Badge className="mb-4 bg-[oklch(0.55_0.25_264)]/10 text-[oklch(0.55_0.25_264)] border-[oklch(0.55_0.25_264)] hover:bg-[oklch(0.55_0.25_264)]/20">
                <AlertCircle className="w-3 h-3 mr-2" />
                Por que FLUX existe
              </Badge>
              <h2 className="text-4xl sm:text-5xl md:text-6xl font-black text-[oklch(0.15_0_0)] mb-6">
                Corrigindo um Problema Estrutural
              </h2>
            </div>

            <div className="space-y-6 text-lg text-[oklch(0.35_0_0)] leading-relaxed">
              <p>
                O mercado de logística urbana enfrentava um problema crônico: <strong className="text-[oklch(0.15_0_0)]">plataformas intermediárias cobrando taxas abusivas</strong> que chegam a 15-20% do faturamento de empresas e entregadores. Essas taxas não refletem o valor real do serviço prestado, apenas a posição de monopólio de algumas aplicações.
              </p>

              <p>
                Empresas de pequeno e médio porte (farmácias, lanchonetes, pizzarias) e entregadores autônomos eram os mais prejudicados. Um entregador que ganhava R$ 100 perdia R$ 15-20 em comissões. Uma empresa que faturava R$ 10 mil mensais perdia R$ 1.500-2.000 em taxas desnecessárias.
              </p>

              <p>
                <strong className="text-[oklch(0.15_0_0)]">FLUX foi criado para eliminar esse superfaturamento.</strong> Oferecemos um modelo de assinatura fixa e transparente, onde você paga apenas pelo acesso à plataforma, não por cada transação. Isso significa que <strong className="text-[oklch(0.75_0.30_145)]">100% do seu faturamento permanece com você</strong>.
              </p>

              <p>
                Nossa proposta é simples e justa: <strong className="text-[oklch(0.15_0_0)]">conectar diretamente quem precisa enviar com quem precisa entregar</strong>, sem intermediários cobrando comissões predatórias. Tecnologia a serviço da eficiência, não da exploração.
              </p>
            </div>

            <div className="mt-12 p-8 bg-white rounded-2xl border-2 border-[oklch(0.88_0_0)] shadow-lg">
              <div className="flex items-start gap-4">
                <Shield className="w-6 h-6 text-[oklch(0.55_0.25_264)] flex-shrink-0 mt-1" />
                <div>
                  <h3 className="font-bold text-[oklch(0.15_0_0)] mb-2">Compromisso Institucional</h3>
                  <p className="text-sm text-[oklch(0.45_0_0)]">
                    FLUX opera com total transparência e conformidade legal. Emitimos Nota Fiscal (NFS-e) para todas as assinaturas. Não possuímos vínculo empregatício com entregadores. Somos uma plataforma de conexão, não um intermediário explorador.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Vantagens Section */}
      <section id="vantagens" className="py-24 bg-white scroll-mt-20">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl sm:text-5xl md:text-6xl font-black text-[oklch(0.15_0_0)] mb-4">
              Por Que Escolher o FLUX?
            </h2>
            <p className="text-lg text-[oklch(0.45_0_0)] max-w-2xl mx-auto">
              A solução definitiva para quem quer <strong>lucrar mais</strong> e <strong>pagar menos</strong>.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-6xl mx-auto">
            {/* Card Empresas */}
            <Card className="border-2 border-[oklch(0.88_0_0)] hover:border-[oklch(0.55_0.25_264)] transition-all duration-300 hover:shadow-brutal bg-gradient-to-br from-white to-[oklch(0.98_0_0)]">
              <CardHeader>
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-3 rounded-xl bg-[oklch(0.55_0.25_264)]/10 border-2 border-[oklch(0.55_0.25_264)]">
                    <Store className="w-6 h-6 text-[oklch(0.55_0.25_264)]" />
                  </div>
                  <Badge variant="outline" className="border-[oklch(0.55_0.25_264)] text-[oklch(0.55_0.25_264)] font-bold">
                    Para Empresas
                  </Badge>
                </div>
                <CardTitle className="text-3xl font-black text-[oklch(0.15_0_0)]">
                  Otimize sua operação.
                </CardTitle>
                <CardDescription className="text-base text-[oklch(0.45_0_0)]">
                  Farmácias, lanchonetes, pizzarias e qualquer negócio que precisa de entregas rápidas e eficientes.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex gap-4">
                  <div className="p-2 rounded-lg bg-[oklch(0.55_0.25_264)]/10 h-fit">
                    <Smartphone className="w-5 h-5 text-[oklch(0.55_0.25_264)]" />
                  </div>
                  <div>
                    <h4 className="font-bold text-[oklch(0.15_0_0)] mb-1">Solicitação Instantânea</h4>
                    <p className="text-sm text-[oklch(0.45_0_0)]">Chame entregadores em segundos. Painel intuitivo e direto ao ponto.</p>
                  </div>
                </div>
                <div className="flex gap-4">
                  <div className="p-2 rounded-lg bg-[oklch(0.55_0.25_264)]/10 h-fit">
                    <Shield className="w-5 h-5 text-[oklch(0.55_0.25_264)]" />
                  </div>
                  <div>
                    <h4 className="font-bold text-[oklch(0.15_0_0)] mb-1">Sem Comissões</h4>
                    <p className="text-sm text-[oklch(0.45_0_0)]">Seu lucro é sagrado. Pague apenas a assinatura fixa mensal.</p>
                  </div>
                </div>
                <div className="flex gap-4">
                  <div className="p-2 rounded-lg bg-[oklch(0.55_0.25_264)]/10 h-fit">
                    <Users className="w-5 h-5 text-[oklch(0.55_0.25_264)]" />
                  </div>
                  <div>
                    <h4 className="font-bold text-[oklch(0.15_0_0)] mb-1">Múltiplos Pedidos</h4>
                    <p className="text-sm text-[oklch(0.45_0_0)]">Um entregador pode pegar vários pedidos. Eficiência máxima.</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Card Entregadores */}
            <Card className="border-2 border-[oklch(0.88_0_0)] hover:border-[oklch(0.75_0.30_145)] transition-all duration-300 hover:shadow-brutal bg-gradient-to-br from-white to-[oklch(0.98_0_0)]">
              <CardHeader>
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-3 rounded-xl bg-[oklch(0.75_0.30_145)]/10 border-2 border-[oklch(0.75_0.30_145)]">
                    <Bike className="w-6 h-6 text-[oklch(0.75_0.30_145)]" />
                  </div>
                  <Badge variant="outline" className="border-[oklch(0.75_0.30_145)] text-[oklch(0.75_0.30_145)] font-bold">
                    Para Entregadores
                  </Badge>
                </div>
                <CardTitle className="text-3xl font-black text-[oklch(0.15_0_0)]">
                  Valorize seu trabalho.
                </CardTitle>
                <CardDescription className="text-base text-[oklch(0.45_0_0)]">
                  Você faz a corrida, você fica com o dinheiro. Simples assim.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex gap-4">
                  <div className="p-2 rounded-lg bg-[oklch(0.75_0.30_145)]/10 h-fit">
                    <TrendingUp className="w-5 h-5 text-[oklch(0.75_0.30_145)]" />
                  </div>
                  <div>
                    <h4 className="font-bold text-[oklch(0.15_0_0)] mb-1">100% do Valor</h4>
                    <p className="text-sm text-[oklch(0.45_0_0)]">Sem taxas ocultas. O valor combinado vai direto para o seu bolso.</p>
                  </div>
                </div>
                <div className="flex gap-4">
                  <div className="p-2 rounded-lg bg-[oklch(0.75_0.30_145)]/10 h-fit">
                    <CheckCircle2 className="w-5 h-5 text-[oklch(0.75_0.30_145)]" />
                  </div>
                  <div>
                    <h4 className="font-bold text-[oklch(0.15_0_0)] mb-1">Liberdade de Verdade</h4>
                    <p className="text-sm text-[oklch(0.45_0_0)]">Sem chefe, sem ranking injusto. Negocie diretamente com as empresas.</p>
                  </div>
                </div>
                <div className="flex gap-4">
                  <div className="p-2 rounded-lg bg-[oklch(0.75_0.30_145)]/10 h-fit">
                    <Zap className="w-5 h-5 text-[oklch(0.75_0.30_145)]" />
                  </div>
                  <div>
                    <h4 className="font-bold text-[oklch(0.15_0_0)] mb-1">Pedidos Ilimitados</h4>
                    <p className="text-sm text-[oklch(0.45_0_0)]">Quanto mais você trabalha, mais você ganha. Sem limites.</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Economia Section */}
      <section id="economia" className="py-24 bg-mesh-gradient scroll-mt-20">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-5xl md:text-6xl font-black text-[oklch(0.15_0_0)] mb-3 sm:mb-4">
              Veja Quanto Você Economiza
            </h2>
            <p className="text-base sm:text-lg text-[oklch(0.45_0_0)] max-w-2xl mx-auto">
              Comparação real entre FLUX e plataformas com taxas abusivas de 15-20%
            </p>
          </div>

          {/* Toggle Empresas/Entregadores */}
          <div className="flex justify-center mb-12">
            <div className="inline-flex items-center bg-[oklch(0.95_0_0)] p-1 rounded-2xl border-2 border-[oklch(0.88_0_0)] relative">
              <div 
                className={`absolute top-1 bottom-1 w-[calc(50%-4px)] bg-[oklch(0.15_0_0)] rounded-xl transition-transform duration-300 ease-out ${activeTab === 'entregador' ? 'translate-x-full' : 'translate-x-0'}`}
              />
              <button
                onClick={() => setActiveTab('empresa')}
                className={`relative z-10 px-4 sm:px-8 py-2 sm:py-3 rounded-xl text-xs sm:text-sm font-bold tracking-wide transition-colors duration-200 ${activeTab === 'empresa' ? 'text-white' : 'text-[oklch(0.45_0_0)] hover:text-[oklch(0.15_0_0)]'}`}
              >
                EMPRESAS
              </button>
              <button
                onClick={() => setActiveTab('entregador')}
                className={`relative z-10 px-4 sm:px-8 py-2 sm:py-3 rounded-xl text-xs sm:text-sm font-bold tracking-wide transition-colors duration-200 ${activeTab === 'entregador' ? 'text-white' : 'text-[oklch(0.45_0_0)] hover:text-[oklch(0.15_0_0)]'}`}
              >
                ENTREGADORES
              </button>
            </div>
          </div>

          {/* Economia Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-5xl mx-auto mb-12">
            {/* Com Taxas */}
            <Card className="border-2 border-red-200 bg-gradient-to-br from-red-50 to-white">
              <CardHeader>
                <div className="flex items-center gap-2 mb-4">
                  <AlertCircle className="w-5 h-5 text-red-500" />
                  <CardTitle className="text-lg sm:text-xl text-red-600">Com Taxas Abusivas</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3 sm:space-y-4">
                  <div>
                    <p className="text-xs sm:text-sm text-[oklch(0.45_0_0)] mb-1">Faturamento Mensal</p>
                    <p className="text-2xl sm:text-3xl font-bold text-[oklch(0.15_0_0)]">{economiaScenario.faturamentoMensal}</p>
                  </div>
                  <Separator />
                  <div>
                    <p className="text-xs sm:text-sm text-[oklch(0.45_0_0)] mb-1">Taxa (15-20%)</p>
                    <p className="text-xl sm:text-2xl font-bold text-red-600">{economiaScenario.taxaRange}</p>
                  </div>
                  <Separator />
                  <div>
                    <p className="text-xs sm:text-sm text-[oklch(0.45_0_0)] mb-1">Você Fica Com</p>
                    <p className="text-2xl sm:text-3xl font-black text-red-600">{economiaScenario.voceFicaRange}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Com FLUX */}
            <Card className="border-2 border-[oklch(0.75_0.30_145)] bg-gradient-to-br from-[oklch(0.75_0.30_145)]/10 to-white">
              <CardHeader>
                <div className="flex items-center gap-2 mb-4">
                  <CheckCircle2 className="w-5 h-5 text-[oklch(0.75_0.30_145)]" />
                  <CardTitle className="text-lg sm:text-xl text-[oklch(0.75_0.30_145)]">Com FLUX (0% Taxas)</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3 sm:space-y-4">
                  <div>
                    <p className="text-xs sm:text-sm text-[oklch(0.45_0_0)] mb-1">Faturamento Mensal</p>
                    <p className="text-2xl sm:text-3xl font-bold text-[oklch(0.15_0_0)]">{economiaScenario.faturamentoMensal}</p>
                  </div>
                  <Separator />
                  <div>
                    <p className="text-xs sm:text-sm text-[oklch(0.45_0_0)] mb-1">Assinatura FLUX</p>
                    <p className="text-xl sm:text-2xl font-bold text-[oklch(0.45_0_0)]">{economiaScenario.assinaturaFlux}</p>
                  </div>
                  <Separator />
                  <div>
                    <p className="text-xs sm:text-sm text-[oklch(0.45_0_0)] mb-1">Você Fica Com</p>
                    <p className="text-2xl sm:text-3xl font-black text-[oklch(0.75_0.30_145)]">{economiaScenario.voceFicaFlux}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Economia Total */}
          <div className="max-w-3xl mx-auto p-8 bg-white rounded-2xl border-2 border-[oklch(0.55_0.25_264)] shadow-brutal">
            <div className="text-center">
              <p className="text-xs sm:text-sm text-[oklch(0.45_0_0)] mb-2">ECONOMIA MENSAL</p>
              <p className="text-3xl sm:text-5xl font-black text-[oklch(0.55_0.25_264)] mb-2 leading-tight">
                {economiaScenario.economiaMensal}
              </p>
              <p className="text-sm sm:text-lg text-[oklch(0.35_0_0)] font-semibold">
                {economiaScenario.economiaLabel}
              </p>
              <p className="text-xs sm:text-sm text-[oklch(0.45_0_0)] mt-3 sm:mt-4">
                {economiaScenario.economiaAnual}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Relatórios Section - Expandido */}
      <section id="relatorios" className="py-24 bg-white scroll-mt-20">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <Badge className="mb-4 bg-[oklch(0.55_0.25_264)]/10 text-[oklch(0.55_0.25_264)] border-[oklch(0.55_0.25_264)] hover:bg-[oklch(0.55_0.25_264)]/20">
              <BarChart3 className="w-3 h-3 mr-2" />
              Inteligência de Negócio
            </Badge>
            <h2 className="text-4xl sm:text-5xl md:text-6xl font-black text-[oklch(0.15_0_0)] mb-4">
              Relatórios Gerenciais Completos
            </h2>
            <p className="text-lg text-[oklch(0.45_0_0)] max-w-3xl mx-auto">
              Controle financeiro preciso e transparente. O FLUX gera <strong>3 tipos de relatórios essenciais</strong> para sua contabilidade mensal, exportáveis a qualquer momento.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto mb-12">
            {/* Relatório 1 */}
            <Card className="border-2 border-[oklch(0.88_0_0)] hover:border-[oklch(0.85_0.20_95)] transition-all duration-300 hover:shadow-brutal">
              <CardHeader>
                <div className="p-3 rounded-xl bg-[oklch(0.85_0.20_95)]/10 border-2 border-[oklch(0.85_0.20_95)] w-fit mb-4">
                  <TrendingUp className="w-6 h-6 text-[oklch(0.85_0.20_95)]" />
                </div>
                <CardTitle className="text-xl font-black text-[oklch(0.15_0_0)]">
                  Consolidado em Andamento
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-[oklch(0.45_0_0)]">
                  Acompanhe em tempo real todas as entregas ativas do mês. Visualize:
                </p>
                <ul className="space-y-2 text-sm text-[oklch(0.35_0_0)]">
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-[oklch(0.85_0.20_95)] flex-shrink-0 mt-0.5" />
                    <span>Quantidade de pedidos em processamento</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-[oklch(0.85_0.20_95)] flex-shrink-0 mt-0.5" />
                    <span>Valor total de entregas pendentes</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-[oklch(0.85_0.20_95)] flex-shrink-0 mt-0.5" />
                    <span>Tempo médio de entrega</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-[oklch(0.85_0.20_95)] flex-shrink-0 mt-0.5" />
                    <span>Taxa de sucesso em tempo real</span>
                  </li>
                </ul>
              </CardContent>
            </Card>

            {/* Relatório 2 */}
            <Card className="border-2 border-[oklch(0.88_0_0)] hover:border-[oklch(0.75_0.30_145)] transition-all duration-300 hover:shadow-brutal">
              <CardHeader>
                <div className="p-3 rounded-xl bg-[oklch(0.75_0.30_145)]/10 border-2 border-[oklch(0.75_0.30_145)] w-fit mb-4">
                  <FileText className="w-6 h-6 text-[oklch(0.75_0.30_145)]" />
                </div>
                <CardTitle className="text-xl font-black text-[oklch(0.15_0_0)]">
                  Consolidado Fechado
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-[oklch(0.45_0_0)]">
                  Relatório completo de todas as entregas finalizadas. Inclui:
                </p>
                <ul className="space-y-2 text-sm text-[oklch(0.35_0_0)]">
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-[oklch(0.75_0.30_145)] flex-shrink-0 mt-0.5" />
                    <span>Total de entregas realizadas no mês</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-[oklch(0.75_0.30_145)] flex-shrink-0 mt-0.5" />
                    <span>Faturamento total consolidado</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-[oklch(0.75_0.30_145)] flex-shrink-0 mt-0.5" />
                    <span>Ticket médio por entrega</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-[oklch(0.75_0.30_145)] flex-shrink-0 mt-0.5" />
                    <span>Taxa de sucesso final do período</span>
                  </li>
                </ul>
              </CardContent>
            </Card>

            {/* Relatório 3 */}
            <Card className="border-2 border-[oklch(0.88_0_0)] hover:border-[oklch(0.55_0.25_264)] transition-all duration-300 hover:shadow-brutal">
              <CardHeader>
                <div className="p-3 rounded-xl bg-[oklch(0.55_0.25_264)]/10 border-2 border-[oklch(0.55_0.25_264)] w-fit mb-4">
                  <PieChart className="w-6 h-6 text-[oklch(0.55_0.25_264)]" />
                </div>
                <CardTitle className="text-xl font-black text-[oklch(0.15_0_0)]">
                  Detalhamento por Profissional
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-[oklch(0.45_0_0)]">
                  Performance individual de cada entregador ou empresa. Visualize:
                </p>
                <ul className="space-y-2 text-sm text-[oklch(0.35_0_0)]">
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-[oklch(0.55_0.25_264)] flex-shrink-0 mt-0.5" />
                    <span>Entregas por profissional/empresa</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-[oklch(0.55_0.25_264)] flex-shrink-0 mt-0.5" />
                    <span>Faturamento individual</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-[oklch(0.55_0.25_264)] flex-shrink-0 mt-0.5" />
                    <span>Taxa de sucesso por profissional</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-[oklch(0.55_0.25_264)] flex-shrink-0 mt-0.5" />
                    <span>Ranking de performance</span>
                  </li>
                </ul>
              </CardContent>
            </Card>
          </div>

          {/* Benefícios dos Relatórios */}
          <div className="max-w-4xl mx-auto p-8 bg-[oklch(0.98_0_0)] rounded-2xl border-2 border-[oklch(0.88_0_0)]">
            <h3 className="text-2xl font-black text-[oklch(0.15_0_0)] mb-6">Por Que Esses Relatórios São Essenciais?</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="flex gap-4">
                <DollarSign className="w-6 h-6 text-[oklch(0.55_0.25_264)] flex-shrink-0" />
                <div>
                  <h4 className="font-bold text-[oklch(0.15_0_0)] mb-1">Controle Financeiro Preciso</h4>
                  <p className="text-sm text-[oklch(0.45_0_0)]">Saiba exatamente quanto você faturou, sem surpresas ou discrepâncias.</p>
                </div>
              </div>
              <div className="flex gap-4">
                <Target className="w-6 h-6 text-[oklch(0.75_0.30_145)] flex-shrink-0" />
                <div>
                  <h4 className="font-bold text-[oklch(0.15_0_0)] mb-1">Otimização de Operações</h4>
                  <p className="text-sm text-[oklch(0.45_0_0)]">Identifique gargalos e oportunidades de melhoria.</p>
                </div>
              </div>
              <div className="flex gap-4">
                <LineChart className="w-6 h-6 text-[oklch(0.85_0.20_95)] flex-shrink-0" />
                <div>
                  <h4 className="font-bold text-[oklch(0.15_0_0)] mb-1">Tomada de Decisão</h4>
                  <p className="text-sm text-[oklch(0.45_0_0)]">Dados concretos para planejar crescimento e estratégia.</p>
                </div>
              </div>
              <div className="flex gap-4">
                <FileText className="w-6 h-6 text-[oklch(0.55_0.25_264)] flex-shrink-0" />
                <div>
                  <h4 className="font-bold text-[oklch(0.15_0_0)] mb-1">Conformidade Fiscal</h4>
                  <p className="text-sm text-[oklch(0.45_0_0)]">Relatórios exportáveis para contabilidade e auditoria.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Planos Section */}
      <section id="planos" className="py-24 bg-mesh-gradient scroll-mt-20">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-4xl sm:text-5xl md:text-6xl font-black text-[oklch(0.15_0_0)] mb-4">
              Planos Transparentes
            </h2>
            <p className="text-lg text-[oklch(0.45_0_0)] max-w-2xl mx-auto">
              Sem pegadinhas. Escolha o período e tenha <strong>acesso total</strong> à plataforma.
            </p>
          </div>

          {/* Toggle Empresas/Entregadores */}
          <div className="flex justify-center mb-12">
            <div className="inline-flex items-center bg-[oklch(0.95_0_0)] p-1 rounded-2xl border-2 border-[oklch(0.88_0_0)] relative">
              <div 
                className={`absolute top-1 bottom-1 w-[calc(50%-4px)] bg-[oklch(0.15_0_0)] rounded-xl transition-transform duration-300 ease-out ${activeTab === 'entregador' ? 'translate-x-full' : 'translate-x-0'}`}
              />
              <button
                onClick={() => setActiveTab('empresa')}
                className={`relative z-10 px-8 py-3 rounded-xl text-sm font-bold tracking-wide transition-colors duration-200 ${activeTab === 'empresa' ? 'text-white' : 'text-[oklch(0.45_0_0)] hover:text-[oklch(0.15_0_0)]'}`}
              >
                EMPRESAS
              </button>
              <button
                onClick={() => setActiveTab('entregador')}
                className={`relative z-10 px-8 py-3 rounded-xl text-sm font-bold tracking-wide transition-colors duration-200 ${activeTab === 'entregador' ? 'text-white' : 'text-[oklch(0.45_0_0)] hover:text-[oklch(0.15_0_0)]'}`}
              >
                ENTREGADORES
              </button>
            </div>
          </div>

          {/* Grid de Planos */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 max-w-7xl mx-auto">
            {planos.map((plano, index) => (
              <Card 
                key={index}
                className={`relative border-2 transition-all duration-300 flex flex-col ${
                  plano.destaque 
                    ? 'border-[oklch(0.15_0_0)] shadow-brutal-lg scale-105 bg-gradient-to-br from-white to-[oklch(0.98_0_0)]' 
                    : 'border-[oklch(0.88_0_0)] hover:border-[oklch(0.75_0_0)] hover:shadow-brutal bg-white'
                }`}
              >
                {plano.destaque && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-[oklch(0.15_0_0)] text-white text-xs font-bold uppercase tracking-wider px-4 py-1.5 rounded-full shadow-lg">
                    Recomendado
                  </div>
                )}
                
                <CardHeader>
                  <div className="mb-4">
                    <p className="text-xs font-bold uppercase tracking-wider text-[oklch(0.45_0_0)] mb-2">
                      {plano.nome}
                    </p>
                    <div className="flex items-baseline gap-1 mb-2">
                      <span className="text-sm text-[oklch(0.45_0_0)] font-medium">R$</span>
                      <span className="text-4xl font-bold text-[oklch(0.15_0_0)]">
                        {plano.preco.split(',')[0]}
                      </span>
                      <span className="text-xl text-[oklch(0.45_0_0)] font-bold">
                        ,{plano.preco.split(',')[1]}
                      </span>
                    </div>
                    <p className="text-xs text-[oklch(0.60_0_0)] font-semibold mb-3">
                      {plano.dias} dias de acesso
                    </p>
                    {plano.economia && (
                      <Badge 
                        variant="outline" 
                        className={`text-xs font-bold ${
                          activeTab === 'empresa' 
                            ? 'border-[oklch(0.55_0.25_264)] text-[oklch(0.55_0.25_264)]' 
                            : 'border-[oklch(0.75_0.30_145)] text-[oklch(0.75_0.30_145)]'
                        }`}
                      >
                        {plano.economia}
                      </Badge>
                    )}
                  </div>
                  
                  <CardDescription className="text-sm text-[oklch(0.35_0_0)] leading-relaxed border-t border-[oklch(0.88_0_0)] pt-4">
                    {plano.descricao}
                  </CardDescription>
                </CardHeader>

                <CardContent className="space-y-2 flex-1">
                  {plano.vantagens.map((vantagem, idx) => (
                    <div key={idx} className="flex items-center gap-2 text-sm text-[oklch(0.35_0_0)]">
                      <CheckCircle2 className={`w-4 h-4 flex-shrink-0 ${activeTab === 'empresa' ? 'text-[oklch(0.55_0.25_264)]' : 'text-[oklch(0.75_0.30_145)]'}`} />
                      <span>{vantagem}</span>
                    </div>
                  ))}
                </CardContent>

                <CardFooter className="flex flex-col gap-2">
                  {(() => {
                    const planKey = `${activeTab === "empresa" ? "company" : "driver"}_${plano.dias}d`;
                    const isLoading = checkoutLoadingPlanKey === planKey;
                    return (
                  <Button 
                    className={`w-full font-bold transition-all ${
                      plano.destaque 
                        ? 'bg-[oklch(0.15_0_0)] text-white hover:bg-[oklch(0.25_0_0)] shadow-lg hover:shadow-xl' 
                        : 'bg-[oklch(0.95_0_0)] text-[oklch(0.15_0_0)] hover:bg-[oklch(0.88_0_0)]'
                    }`}
                    disabled={isLoading}
                    onClick={() => void handleSubscribe(plano.dias)}
                  >
                    {isLoading ? "PROCESSANDO..." : "ASSINAR"}
                  </Button>
                    );
                  })()}
                  <p className="text-xs text-center text-[oklch(0.60_0_0)]">Nota Fiscal Inclusa</p>
                </CardFooter>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Final Section */}
      <section className="py-24 bg-[oklch(0.15_0_0)] text-white relative overflow-hidden">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="max-w-4xl mx-auto text-center">
            <h2 className="text-4xl sm:text-5xl md:text-6xl font-black mb-6">
              Pronto para Lucrar Mais?
            </h2>
            <p className="text-xl text-white/80 mb-10 max-w-2xl mx-auto">
              Junte-se a centenas de empresas e entregadores que já estão <strong>fugindo das taxas</strong> e maximizando seus ganhos com FLUX.
            </p>
            
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-8">
              <Button asChild size="lg" className="bg-[oklch(0.75_0.30_145)] text-[oklch(0.15_0_0)] hover:bg-[oklch(0.85_0.30_145)] font-bold text-lg px-8 py-6 shadow-xl hover:shadow-2xl transition-all group">
                <a href="#">
                  <Download className="mr-2" />
                  Baixar Agora
                </a>
              </Button>
              <Button asChild size="lg" variant="outline" className="border-2 border-white text-white hover:bg-white hover:text-[oklch(0.15_0_0)] font-bold text-lg px-8 py-6 transition-all">
                <a href="#">Falar com Suporte</a>
              </Button>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <a href="#" className="transition-transform hover:scale-105">
                <img 
                  src="https://upload.wikimedia.org/wikipedia/commons/3/3c/Download_on_the_App_Store_Badge.svg" 
                  alt="Download na App Store" 
                  className="h-12"
                />
              </a>
              <a href="#" className="transition-transform hover:scale-105">
                <img 
                  src="https://upload.wikimedia.org/wikipedia/commons/7/78/Google_Play_Store_badge_EN.svg" 
                  alt="Disponível no Google Play" 
                  className="h-12"
                />
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-[oklch(0.98_0_0)] py-16 border-t border-[oklch(0.88_0_0)]">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-12">
            {/* Logo e Descrição */}
            <div className="col-span-1 md:col-span-2">
              <div className="flex items-center gap-3 mb-6">
                <img 
                  src="/images/flux-logo.png" 
                  alt="FLUX Logo" 
                  className="h-10 w-10 object-contain opacity-80"
                />
                <span className="font-brand text-2xl tracking-wider text-[oklch(0.15_0_0)] opacity-80">FLUX</span>
              </div>
              <p className="text-sm text-[oklch(0.45_0_0)] leading-relaxed mb-6 max-w-md">
                O FLUX é a evolução da logística urbana. Tecnologia de ponta para conectar quem precisa enviar com quem precisa entregar. Sem taxas, sem complicação, sem exploração.
              </p>
              <div className="flex gap-4">
                <a href="#" className="transition-opacity hover:opacity-100 opacity-70">
                  <img 
                    src="https://upload.wikimedia.org/wikipedia/commons/3/3c/Download_on_the_App_Store_Badge.svg" 
                    alt="App Store" 
                    className="h-8"
                  />
                </a>
                <a href="#" className="transition-opacity hover:opacity-100 opacity-70">
                  <img 
                    src="https://upload.wikimedia.org/wikipedia/commons/7/78/Google_Play_Store_badge_EN.svg" 
                    alt="Google Play" 
                    className="h-8"
                  />
                </a>
              </div>
            </div>

            {/* Produto */}
            <div>
              <h4 className="text-[oklch(0.15_0_0)] font-bold mb-4">Produto</h4>
              <ul className="space-y-3 text-sm text-[oklch(0.45_0_0)]">
                <li><a href="#vantagens" className="hover:text-[oklch(0.15_0_0)] transition-colors">Vantagens</a></li>
                <li><a href="#economia" className="hover:text-[oklch(0.15_0_0)] transition-colors">Economia</a></li>
                <li><a href="#relatorios" className="hover:text-[oklch(0.15_0_0)] transition-colors">Relatórios</a></li>
                <li><a href="#planos" className="hover:text-[oklch(0.15_0_0)] transition-colors">Planos</a></li>
              </ul>
            </div>

            {/* Legal */}
            <div>
              <h4 className="text-[oklch(0.15_0_0)] font-bold mb-4">Legal</h4>
              <ul className="space-y-3 text-sm text-[oklch(0.45_0_0)]">
                <li><a href="#" className="hover:text-[oklch(0.15_0_0)] transition-colors">Termos de Uso</a></li>
                <li><a href="#" className="hover:text-[oklch(0.15_0_0)] transition-colors">Privacidade</a></li>
                <li><a href="#" className="hover:text-[oklch(0.15_0_0)] transition-colors">Compliance</a></li>
              </ul>
            </div>
          </div>

          <Separator className="mb-8" />

          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
            <p className="text-xs text-[oklch(0.60_0_0)]">
              © {new Date().getFullYear()} FLUX Tecnologia Ltda. Todos os direitos reservados.
            </p>
            
            <div className="text-xs text-[oklch(0.60_0_0)] max-w-2xl text-justify md:text-right leading-relaxed">
              <strong>Aviso Legal:</strong> Este site e aplicativo operam com caráter demonstrativo e de auxílio à gestão logística. 
              A emissão de Nota Fiscal (NFS-e) é garantida para todas as assinaturas. 
              Os relatórios gerados não substituem documentos fiscais oficiais. 
              Não possuímos vínculo empregatício com os usuários cadastrados como entregadores. 
              Todas as transações são de responsabilidade das partes envolvidas.
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}




