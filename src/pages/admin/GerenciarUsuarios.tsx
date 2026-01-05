import { useAuth } from '@/contexts/AuthContext';
import { AppLayout } from '@/components/AppLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useUsers, useAddCredits, useBanUser, useDeleteUser } from '@/hooks/useUsers';
import { useState } from 'react';
import { toast } from 'sonner';
import { 
  ArrowLeft, 
  Search,
  User,
  Building2,
  Truck,
  Ban,
  Trash2,
  CreditCard,
  CheckCircle2,
  XCircle,
  Loader2,
  RefreshCw,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const roleConfig = {
  admin: { label: 'Admin', icon: User, className: 'bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300' },
  company: { label: 'Empresa', icon: Building2, className: 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300' },
  driver: { label: 'Entregador', icon: Truck, className: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300' },
};

const GerenciarUsuarios = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  
  const { data: users, isLoading, refetch, isRefetching } = useUsers();
  const addCreditsMutation = useAddCredits();
  const banUserMutation = useBanUser();
  const deleteUserMutation = useDeleteUser();

  if (!user || user.role !== 'admin') return null;

  const filteredUsers = users?.filter(u => 
    u.name.toLowerCase().includes(search.toLowerCase()) ||
    u.email.toLowerCase().includes(search.toLowerCase())
  ) || [];

  const handleBan = async (userId: string, currentlyBanned: boolean) => {
    if (userId === user.id) {
      toast.error('Você não pode banir sua própria conta');
      return;
    }

    try {
      await banUserMutation.mutateAsync({ userId, banned: !currentlyBanned });
      toast.success(currentlyBanned ? 'Banimento removido' : 'Usuário banido');
    } catch (error) {
      toast.error('Erro ao atualizar banimento');
    }
  };

  const handleDelete = async (userId: string) => {
    if (userId === user.id) {
      toast.error('Você não pode excluir sua própria conta');
      return;
    }
    
    try {
      await deleteUserMutation.mutateAsync(userId);
      toast.success('Usuário excluído');
    } catch (error) {
      toast.error('Erro ao excluir usuário');
    }
  };

  const handleAddCredits = async (userId: string) => {
    try {
      // Add 30 days of credits
      const validUntil = new Date();
      validUntil.setDate(validUntil.getDate() + 30);
      
      await addCreditsMutation.mutateAsync({ userId, validUntil });
      toast.success('Crédito de 30 dias adicionado');
    } catch (error) {
      toast.error('Erro ao adicionar crédito');
    }
  };

  const formatDate = (date: Date) => {
    return format(date, "dd/MM/yyyy", { locale: ptBR });
  };

  const hasValidCredits = (userCredits: { validUntil: Date } | null) => {
    if (!userCredits) return false;
    return new Date(userCredits.validUntil) > new Date();
  };

  return (
    <AppLayout>
      <div className="space-y-6 px-1">
        {/* Header */}
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-4 min-w-0">
            <Button variant="ghost" size="icon" onClick={() => navigate('/dashboard')} className="shrink-0">
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="min-w-0">
              <h1 className="text-2xl font-semibold text-foreground truncate">Gerenciar Usuários</h1>
              <p className="text-muted-foreground">{users?.length || 0} usuários</p>
            </div>
          </div>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => refetch()}
            disabled={isRefetching}
            className="shrink-0"
          >
            <RefreshCw className={cn("h-4 w-4", isRefetching && "animate-spin")} />
            Atualizar
          </Button>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome ou email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Loading state */}
        {isLoading && (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        )}

        {/* Empty state */}
        {!isLoading && filteredUsers.length === 0 && (
          <div className="text-center py-12">
            <User className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">
              {search ? 'Nenhum usuário encontrado' : 'Nenhum usuário cadastrado'}
            </p>
          </div>
        )}

        {/* Users list */}
        <div className="space-y-3">
          {filteredUsers.map((u, index) => {
            const config = u.role ? roleConfig[u.role] : { label: 'Sem role', icon: User, className: 'bg-gray-100 text-gray-800' };
            const RoleIcon = config.icon;
            const isActive = u.role === 'admin' || hasValidCredits(u.credits);

            return (
              <div
                key={u.id}
                className="card-static p-4 opacity-0 animate-fade-in overflow-hidden"
                style={{ animationDelay: `${index * 30}ms` }}
              >
                <div className="flex flex-col sm:flex-row sm:items-start gap-3 sm:gap-4">
                  <div className="flex items-start gap-3 sm:gap-4 min-w-0 flex-1">
                    <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-secondary flex items-center justify-center shrink-0">
                      <RoleIcon className="h-5 w-5 sm:h-6 sm:w-6 text-muted-foreground" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 mb-1">
                        <p className="font-semibold text-foreground truncate max-w-[150px] sm:max-w-none">{u.name}</p>
                        <span className={cn('text-xs px-2 py-0.5 rounded-full font-medium whitespace-nowrap', config.className)}>
                          {config.label}
                        </span>
                        {u.isBanned && (
                          <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-red-100 text-red-800 whitespace-nowrap">
                            Banido
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground truncate">{u.email}</p>
                      {u.phone && <p className="text-sm text-muted-foreground truncate">{u.phone}</p>}
                      <div className="flex items-center gap-2 mt-2">
                        {u.role === 'admin' ? (
                          <span className="text-xs text-purple-600 flex items-center gap-1">
                            <CheckCircle2 className="h-3 w-3 shrink-0" />
                            <span className="truncate">Acesso ilimitado</span>
                          </span>
                        ) : isActive ? (
                          <span className="text-xs text-emerald-600 flex items-center gap-1">
                            <CheckCircle2 className="h-3 w-3 shrink-0" />
                            <span className="truncate">Ativo até {u.credits ? formatDate(u.credits.validUntil) : ''}</span>
                          </span>
                        ) : (
                          <span className="text-xs text-red-600 flex items-center gap-1">
                            <XCircle className="h-3 w-3 shrink-0" />
                            <span className="truncate">{u.credits ? 'Expirado' : 'Sem créditos'}</span>
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-1 self-end sm:self-start shrink-0">
                    {u.role !== 'admin' && (
                      <>
                        <Button 
                          variant="ghost" 
                          size="icon-sm" 
                          onClick={() => handleAddCredits(u.id)} 
                          title="Adicionar crédito"
                          disabled={addCreditsMutation.isPending}
                        >
                          <CreditCard className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="icon-sm" 
                          onClick={() => handleBan(u.id, !!u.isBanned)} 
                          title={u.isBanned ? 'Remover banimento' : 'Banir'}
                          disabled={banUserMutation.isPending}
                        >
                          <Ban className="h-4 w-4" />
                        </Button>
                      </>
                    )}
                    {u.id !== user.id && (
                      <Button 
                        variant="ghost" 
                        size="icon-sm" 
                        onClick={() => handleDelete(u.id)} 
                        title="Excluir" 
                        className="text-destructive"
                        disabled={deleteUserMutation.isPending}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </AppLayout>
  );
};

export default GerenciarUsuarios;
