/* BUILD: 2026-01-03 22:05:27 */
import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  Menu,
  X,
  LogIn,
  LogOut,
  User,
  CreditCard,
  Home,
  FileText,
  HelpCircle,
  Star,
  Zap,
  ChevronRight,
  Settings,
  Download,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import logoClaro from "@/assets/logo_tclaro.png";

interface HeaderProps {
  onLogin?: () => void;
  onLogout?: () => void;
}

export default function Header({ onLogin, onLogout }: HeaderProps) {
  const [, setLocation] = useLocation();
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { isAuthenticated, profile, supabaseUser, signOut, role } = useAuth();

  const userEmail = profile?.email ?? supabaseUser?.email ?? null;
  const userName = profile?.name ?? supabaseUser?.user_metadata?.full_name ?? "Usuário";
  const userAvatarUrl = (supabaseUser?.user_metadata?.avatar_url as string | undefined) ?? null;
  const userInitial = userName.charAt(0).toUpperCase();

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const handleLogin = () => {
    setMobileMenuOpen(false);
    if (onLogin) {
      onLogin();
    } else {
      setLocation("/login");
    }
  };

  const handleLogout = async () => {
    try {
      setMobileMenuOpen(false);
      await signOut();
      // AuthContext redirects to "/".
      if (onLogout) onLogout();
    } catch (error) {
      console.error("Logout error:", error);
      toast.error("❌ Erro ao sair. Tente novamente.");
      window.location.replace("/");
    }
  };

  const navigateTo = (path: string) => {
    setMobileMenuOpen(false);
    setLocation(path);
  };

  const scrollToSection = (id: string) => {
    setMobileMenuOpen(false);
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled
          ? "bg-white/95 backdrop-blur-md border-b border-[oklch(0.88_0_0)] shadow-sm"
          : "bg-transparent"
      }`}
    >
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 md:h-20">
          {/* Logo - Always visible */}
          <div
            className="flex items-center space-x-2 md:space-x-3 cursor-pointer group flex-shrink-0"
            onClick={() => {
              setLocation("/");
              window.scrollTo({ top: 0, behavior: "smooth" });
            }}
          >
            <div className="w-10 h-10 md:w-12 md:h-12 flex items-center justify-center transition-transform group-hover:scale-110">
              <img src={logoClaro} alt="FLUX Logo" className="w-full h-full object-contain" />
            </div>
            <div className="hidden sm:flex flex-col">
              <span
                className="font-black text-xl md:text-2xl bg-gradient-to-r from-[oklch(0.15_0_0)] to-[oklch(0.55_0.25_264)] bg-clip-text text-transparent"
                style={{ fontFamily: "'Zen Dots', cursive" }}
              >
                FLUX
              </span>
              <span className="text-xs font-bold uppercase tracking-wider text-[oklch(0.45_0_0)]">
                Institucional
              </span>
            </div>
          </div>

          {/* Desktop Navigation - Center */}
          <nav className="hidden md:flex items-center space-x-1">
            <Button
              variant="ghost"
              className="text-sm font-medium text-[oklch(0.45_0_0)] hover:text-[oklch(0.15_0_0)] hover:bg-[oklch(0.95_0_0)]"
              onClick={() => scrollToSection("home")}
            >
              Início
            </Button>
            <Button
              variant="ghost"
              className="text-sm font-medium text-[oklch(0.45_0_0)] hover:text-[oklch(0.15_0_0)] hover:bg-[oklch(0.95_0_0)]"
              onClick={() => scrollToSection("planos")}
            >
              Planos
            </Button>
            <Button
              variant="ghost"
              className="text-sm font-medium text-[oklch(0.45_0_0)] hover:text-[oklch(0.15_0_0)] hover:bg-[oklch(0.95_0_0)]"
              onClick={() => scrollToSection("recursos")}
            >
              Recursos
            </Button>
            <Button
              variant="ghost"
              className="text-sm font-medium text-[oklch(0.45_0_0)] hover:text-[oklch(0.15_0_0)] hover:bg-[oklch(0.95_0_0)]"
              onClick={() => scrollToSection("depoimentos")}
            >
              Depoimentos
            </Button>
            <Button
              variant="ghost"
              className="text-sm font-medium text-[oklch(0.45_0_0)] hover:text-[oklch(0.15_0_0)] hover:bg-[oklch(0.95_0_0)]"
              onClick={() => scrollToSection("faq")}
            >
              FAQ
            </Button>
          </nav>

          {/* Desktop Auth - Right */}
          <div className="hidden md:flex items-center space-x-3">
            {isAuthenticated && userEmail ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="relative h-10 w-10 rounded-full ring-2 ring-offset-2 ring-[oklch(0.55_0.25_264)] hover:ring-[oklch(0.45_0.25_264)]"
                  >
                    <Avatar className="h-10 w-10">
                      {userAvatarUrl ? (
                        <AvatarImage src={userAvatarUrl} alt={userName} />
                      ) : (
                        <AvatarFallback className="bg-gradient-to-br from-[oklch(0.55_0.25_264)] to-[oklch(0.45_0.25_264)] text-white font-bold">
                          {userInitial}
                        </AvatarFallback>
                      )}
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-64 border-[oklch(0.88_0_0)]">
                  <DropdownMenuLabel className="flex flex-col space-y-2 p-3">
                    <div className="flex items-center space-x-3">
                      <Avatar className="h-12 w-12">
                        {userAvatarUrl ? (
                          <AvatarImage src={userAvatarUrl} alt={userName} />
                        ) : (
                          <AvatarFallback className="bg-gradient-to-br from-[oklch(0.55_0.25_264)] to-[oklch(0.45_0.25_264)] text-white font-bold">
                            {userInitial}
                          </AvatarFallback>
                        )}
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-[oklch(0.15_0_0)] truncate">{userName}</p>
                        <p className="text-xs text-[oklch(0.60_0_0)] truncate">{userEmail}</p>
                        {role && (
                          <p className="text-xs font-semibold text-[oklch(0.55_0.25_264)] mt-1 uppercase">
                            {role === "company" ? "👔 Empresa" : role === "driver" ? "🚗 Entregador" : "⚙️ Admin"}
                          </p>
                        )}
                      </div>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator className="bg-[oklch(0.88_0_0)]" />

                  {/* Account Section */}
                  <div className="px-1 py-2">
                    <p className="px-2 py-1 text-xs font-bold uppercase text-[oklch(0.60_0_0)]">Minha Conta</p>
                    <DropdownMenuItem onClick={() => navigateTo("/conta")} className="cursor-pointer">
                      <User className="mr-2 h-4 w-4 text-[oklch(0.55_0.25_264)]" />
                      <span className="text-sm">Informações Pessoais</span>
                      <ChevronRight className="ml-auto h-4 w-4 text-[oklch(0.75_0_0)]" />
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => navigateTo("/plano")} className="cursor-pointer">
                      <CreditCard className="mr-2 h-4 w-4 text-[oklch(0.75_0.30_145)]" />
                      <span className="text-sm">Meu Plano</span>
                      <ChevronRight className="ml-auto h-4 w-4 text-[oklch(0.75_0_0)]" />
                    </DropdownMenuItem>
                  </div>

                  <DropdownMenuSeparator className="bg-[oklch(0.88_0_0)]" />

                  {/* General Section */}
                  <div className="px-1 py-2">
                    <p className="px-2 py-1 text-xs font-bold uppercase text-[oklch(0.60_0_0)]">Geral</p>
                    <DropdownMenuItem onClick={() => scrollToSection("faq")} className="cursor-pointer">
                      <HelpCircle className="mr-2 h-4 w-4 text-[oklch(0.45_0_0)]" />
                      <span className="text-sm">Ajuda & FAQ</span>
                    </DropdownMenuItem>
                  </div>

                  <DropdownMenuSeparator className="bg-[oklch(0.88_0_0)]" />

                  {/* Logout */}
                  <DropdownMenuItem
                    onClick={() => void handleLogout()}
                    className="text-red-600 cursor-pointer bg-red-50 hover:bg-red-100"
                  >
                    <LogOut className="mr-2 h-4 w-4" />
                    <span className="text-sm font-semibold">Sair</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <div className="flex items-center space-x-2">
                <Button
                  variant="ghost"
                  onClick={handleLogin}
                  className="text-sm font-semibold text-[oklch(0.45_0_0)] hover:text-[oklch(0.15_0_0)]"
                >
                  <LogIn className="mr-2 h-4 w-4" />
                  Entrar
                </Button>
                <Button
                  onClick={handleLogin}
                  className="text-sm font-bold bg-[oklch(0.55_0.25_264)] text-white hover:bg-[oklch(0.45_0.25_264)]"
                >
                  Começar Agora
                </Button>
              </div>
            )}
          </div>

          {/* Mobile Menu Trigger */}
          <div className="md:hidden">
            <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="h-10 w-10">
                  {mobileMenuOpen ? (
                    <X className="h-6 w-6 text-[oklch(0.15_0_0)]" />
                  ) : (
                    <Menu className="h-6 w-6 text-[oklch(0.15_0_0)]" />
                  )}
                </Button>
              </SheetTrigger>

              {/* Mobile Sheet Content */}
              <SheetContent side="right" className="w-full sm:w-[350px] p-0 bg-white">
                <SheetHeader className="p-4 border-b border-[oklch(0.88_0_0)]">
                  <div className="flex items-center space-x-3">
                    <img src={logoClaro} alt="FLUX Logo" className="w-8 h-8" />
                    <div className="flex flex-col">
                      <SheetTitle
                        className="font-black text-xl bg-gradient-to-r from-[oklch(0.15_0_0)] to-[oklch(0.55_0.25_264)] bg-clip-text text-transparent"
                        style={{ fontFamily: "'Zen Dots', cursive" }}
                      >
                        FLUX
                      </SheetTitle>
                      <span className="text-xs font-bold uppercase tracking-wider text-[oklch(0.45_0_0)]">
                        Institucional
                      </span>
                    </div>
                  </div>
                </SheetHeader>

                <div className="flex flex-col h-[calc(100vh-80px)] overflow-y-auto">
                  {/* User Info - if authenticated */}
                  {isAuthenticated && userEmail && (
                    <div className="p-4 border-b border-[oklch(0.88_0_0)] bg-[oklch(0.98_0_0)]">
                      <div className="flex items-center space-x-3 p-3 rounded-lg bg-white border border-[oklch(0.88_0_0)]">
                        <Avatar className="h-12 w-12">
                          {userAvatarUrl ? (
                            <AvatarImage src={userAvatarUrl} alt={userName} />
                          ) : (
                            <AvatarFallback className="bg-gradient-to-br from-[oklch(0.55_0.25_264)] to-[oklch(0.45_0.25_264)] text-white font-bold text-lg">
                              {userInitial}
                            </AvatarFallback>
                          )}
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-bold text-[oklch(0.15_0_0)] truncate">{userName}</p>
                          <p className="text-xs text-[oklch(0.60_0_0)] truncate">{userEmail}</p>
                          {role && (
                            <p className="text-xs font-semibold text-[oklch(0.55_0.25_264)] mt-1 uppercase">
                              {role === "company"
                                ? "👔 Empresa"
                                : role === "driver"
                                  ? "🚗 Entregador"
                                  : "⚙️ Admin"}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Main Navigation - unauthenticated or home navigation */}
                  <div className="flex-1 px-4 py-6">
                    <p className="px-2 py-2 text-xs font-bold uppercase text-[oklch(0.60_0_0)] mb-2">
                      Navegação
                    </p>
                    <nav className="flex flex-col space-y-2">
                      <Button
                        variant="ghost"
                        className="justify-start text-base font-medium text-[oklch(0.15_0_0)] hover:bg-[oklch(0.95_0_0)]"
                        onClick={() => scrollToSection("home")}
                      >
                        <Home className="mr-3 h-5 w-5 text-[oklch(0.55_0.25_264)]" />
                        Início
                      </Button>
                      <Button
                        variant="ghost"
                        className="justify-start text-base font-medium text-[oklch(0.15_0_0)] hover:bg-[oklch(0.95_0_0)]"
                        onClick={() => scrollToSection("planos")}
                      >
                        <CreditCard className="mr-3 h-5 w-5 text-[oklch(0.75_0.30_145)]" />
                        Planos
                      </Button>
                      <Button
                        variant="ghost"
                        className="justify-start text-base font-medium text-[oklch(0.15_0_0)] hover:bg-[oklch(0.95_0_0)]"
                        onClick={() => scrollToSection("recursos")}
                      >
                        <Zap className="mr-3 h-5 w-5 text-amber-500" />
                        Recursos
                      </Button>
                      <Button
                        variant="ghost"
                        className="justify-start text-base font-medium text-[oklch(0.15_0_0)] hover:bg-[oklch(0.95_0_0)]"
                        onClick={() => scrollToSection("depoimentos")}
                      >
                        <Star className="mr-3 h-5 w-5 text-yellow-500" />
                        Depoimentos
                      </Button>
                      <Button
                        variant="ghost"
                        className="justify-start text-base font-medium text-[oklch(0.15_0_0)] hover:bg-[oklch(0.95_0_0)]"
                        onClick={() => scrollToSection("faq")}
                      >
                        <HelpCircle className="mr-3 h-5 w-5 text-[oklch(0.45_0_0)]" />
                        FAQ
                      </Button>
                    </nav>
                  </div>

                  {/* Account Section - if authenticated */}
                  {isAuthenticated && userEmail && (
                    <div className="px-4 py-4 border-t border-[oklch(0.88_0_0)] bg-[oklch(0.98_0_0)]">
                      <p className="px-2 py-2 text-xs font-bold uppercase text-[oklch(0.60_0_0)] mb-2">
                        Minha Conta
                      </p>
                      <div className="flex flex-col space-y-2">
                        <Button
                          className="justify-start text-base font-medium bg-white border-2 border-[oklch(0.88_0_0)] text-[oklch(0.15_0_0)] hover:bg-[oklch(0.95_0_0)]"
                          onClick={() => navigateTo("/conta")}
                        >
                          <User className="mr-3 h-5 w-5 text-[oklch(0.55_0.25_264)]" />
                          Informações Pessoais
                          <ChevronRight className="ml-auto h-5 w-5" />
                        </Button>
                        <Button
                          className="justify-start text-base font-medium bg-white border-2 border-[oklch(0.88_0_0)] text-[oklch(0.15_0_0)] hover:bg-[oklch(0.95_0_0)]"
                          onClick={() => navigateTo("/plano")}
                        >
                          <CreditCard className="mr-3 h-5 w-5 text-[oklch(0.75_0.30_145)]" />
                          Meu Plano
                          <ChevronRight className="ml-auto h-5 w-5" />
                        </Button>
                      </div>
                    </div>
                  )}

                  {/* Auth Section */}
                  <div className="px-4 py-4 border-t border-[oklch(0.88_0_0)] bg-white">
                    {isAuthenticated && userEmail ? (
                      <Button
                        className="w-full text-base font-bold py-6 bg-red-600 text-white hover:bg-red-700 flex items-center justify-center gap-2"
                        onClick={() => void handleLogout()}
                      >
                        <LogOut className="h-5 w-5" />
                        Sair da Conta
                      </Button>
                    ) : (
                      <div className="flex flex-col space-y-2">
                        <Button
                          variant="outline"
                          className="w-full text-base font-bold py-6 border-2 border-[oklch(0.88_0_0)] text-[oklch(0.15_0_0)] hover:bg-[oklch(0.95_0_0)]"
                          onClick={handleLogin}
                        >
                          <LogIn className="mr-2 h-5 w-5" />
                          Entrar
                        </Button>
                        <Button
                          className="w-full text-base font-bold py-6 bg-[oklch(0.55_0.25_264)] text-white hover:bg-[oklch(0.45_0.25_264)]"
                          onClick={handleLogin}
                        >
                          <Zap className="mr-2 h-5 w-5" />
                          Começar Agora
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </div>
    </header>
  );
}

