import { useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Menu, X, LogOut, Home, User, CreditCard } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import logoClaro from "@/assets/logo_tclaro.png";

export default function NavigationHeader() {
  const [, setLocation] = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { isAuthenticated, profile, signOut } = useAuth();

  const navigateToPage = (path: string) => {
    setMobileMenuOpen(false);
    setLocation(path);
  };

  const handleLogout = async () => {
    try {
      await signOut();
      // signOut já redireciona para "/" automaticamente
    } catch (error) {
      toast.error("Erro ao fazer logout");
      window.location.replace("/");
    }
  };

  return (
    <header className="bg-white border-b fixed top-0 left-0 right-0 z-50">
      <div className="container mx-auto px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3 cursor-pointer" onClick={() => navigateToPage("/")}>
          <img src={logoClaro} alt="FLUX" className="h-8" />
          <span className="font-brand text-2xl tracking-wider text-[oklch(0.15_0_0)] hidden sm:block">FLUX</span>
        </div>
        <nav className="hidden md:flex gap-4">
          <Button variant="ghost" onClick={() => navigateToPage("/")}>
            <Home className="w-4 h-4 mr-2" />
            Início
          </Button>
          {isAuthenticated && (
            <>
              <Button variant="ghost" onClick={() => navigateToPage("/conta")}>
                <User className="w-4 h-4 mr-2" />
                Minha Conta
              </Button>
              <Button variant="ghost" onClick={() => navigateToPage("/plano")}>
                <CreditCard className="w-4 h-4 mr-2" />
                Meu Plano
              </Button>
              <Button variant="destructive" onClick={handleLogout}>
                <LogOut className="w-4 h-4 mr-2" />
                Sair
              </Button>
            </>
          )}
        </nav>
        
        {/* Mobile Menu Button */}
        <button 
          className="md:hidden p-2 hover:bg-gray-100 rounded-lg transition-colors"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          aria-label="Menu"
        >
          {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-white border-t border-gray-200 shadow-lg">
          <div className="container mx-auto px-4 py-4 flex flex-col gap-2">
            <Button variant="ghost" className="w-full justify-start" onClick={() => navigateToPage("/")}>
              <Home className="w-4 h-4 mr-2" />
              Início
            </Button>
            {isAuthenticated && (
              <>
                <Button variant="ghost" className="w-full justify-start" onClick={() => navigateToPage("/conta")}>
                  <User className="w-4 h-4 mr-2" />
                  Minha Conta
                </Button>
                <Button variant="ghost" className="w-full justify-start" onClick={() => navigateToPage("/plano")}>
                  <CreditCard className="w-4 h-4 mr-2" />
                  Meu Plano
                </Button>
                <Button variant="destructive" className="w-full justify-start" onClick={handleLogout}>
                  <LogOut className="w-4 h-4 mr-2" />
                  Sair
                </Button>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
