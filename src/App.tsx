import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";

// Pages
import Login from "./pages/Login";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import Perfil from "./pages/Perfil";
import CompletarPerfil from "./pages/CompletarPerfil";
import Configuracoes from "./pages/Configuracoes";
import Creditos from "./pages/Creditos";
import MeusPedidos from "./pages/MeusPedidos";
import PedidoDetalhes from "./pages/PedidoDetalhes";
import Notificacoes from "./pages/Notificacoes";

// Empresa pages
import NovoPedido from "./pages/empresa/NovoPedido";
import PedidoCriado from "./pages/empresa/PedidoCriado";
import PedidosPendentes from "./pages/empresa/PedidosPendentes";
import PedidosEmAndamento from "./pages/empresa/PedidosEmAndamento";
import ConfirmacaoEntrega from "./pages/empresa/ConfirmacaoEntrega";
import EmpresaPedidosConcluidos from "./pages/empresa/PedidosConcluidos";
import CodigosEntrega from "./pages/empresa/CodigosEntrega";

// Entregador pages
import PedidosDisponiveis from "./pages/entregador/PedidosDisponiveis";
import PedidosAceitos from "./pages/entregador/PedidosAceitos";
import PedidosFinalizados from "./pages/entregador/PedidosFinalizados";
import EntregadorPedidosConcluidos from "./pages/entregador/PedidosConcluidos";
import SOS from "./pages/entregador/SOS";

// Admin pages
import GerenciarUsuarios from "./pages/admin/GerenciarUsuarios";
import GerenciarPedidos from "./pages/admin/GerenciarPedidos";
import GerenciarCreditos from "./pages/admin/GerenciarCreditos";
import GerenciarAlertas from "./pages/admin/GerenciarAlertas";

// Shared pages
import Relatorios from "./pages/Relatorios";

import UsuarioPerfil from "./pages/UsuarioPerfil";

import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner position="top-center" />
      <AuthProvider>
        <div style={{ maxWidth: '100vw', overflowX: 'hidden', width: '100%' }}>
          <BrowserRouter>
            <Routes>
            {/* Public routes */}
            <Route path="/" element={<Login />} />
            <Route path="/auth" element={<Auth />} />

            {/* Protected routes */}
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/perfil" element={<Perfil />} />
            <Route path="/completar-perfil" element={<CompletarPerfil />} />
            <Route path="/configuracoes" element={<Configuracoes />} />
            <Route path="/creditos" element={<Creditos />} />
            <Route path="/meus-pedidos" element={<MeusPedidos />} />
            <Route path="/pedido/:id" element={<PedidoDetalhes />} />
            <Route path="/usuario/:id" element={<UsuarioPerfil />} />
            <Route path="/notificacoes" element={<Notificacoes />} />

            {/* Empresa routes */}
            <Route path="/novo-pedido" element={<NovoPedido />} />
            <Route path="/pedido-criado" element={<PedidoCriado />} />
            <Route path="/pedidos-pendentes" element={<PedidosPendentes />} />
            <Route path="/pedidos-em-andamento" element={<PedidosEmAndamento />} />
            <Route path="/confirmacao-entrega" element={<ConfirmacaoEntrega />} />
            <Route path="/empresa/concluidos" element={<EmpresaPedidosConcluidos />} />
            <Route path="/codigos-entrega" element={<CodigosEntrega />} />

            {/* Entregador routes */}
            <Route path="/pedidos-disponiveis" element={<PedidosDisponiveis />} />
            <Route path="/pedidos-aceitos" element={<PedidosAceitos />} />
            <Route path="/pedidos-finalizados" element={<PedidosFinalizados />} />
            <Route path="/entregador/concluidos" element={<EntregadorPedidosConcluidos />} />
            <Route path="/sos" element={<SOS />} />
            <Route path="/relatorios" element={<Relatorios />} />

            {/* Admin routes */}
            <Route path="/admin/usuarios" element={<GerenciarUsuarios />} />
            <Route path="/admin/pedidos" element={<GerenciarPedidos />} />
            <Route path="/admin/creditos" element={<GerenciarCreditos />} />
            <Route path="/admin/alertas" element={<GerenciarAlertas />} />

            {/* Catch-all */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
        </div>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
