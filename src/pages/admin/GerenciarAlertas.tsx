import { useAuth } from '@/contexts/AuthContext';
import { AppLayout } from '@/components/AppLayout';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useUsers } from '@/hooks/useUsers';
import { useAdminAlerts, useCreateAdminAlert, useDeleteAdminAlert } from '@/hooks/useAdminAlerts';
import { useState } from 'react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { 
  ArrowLeft, 
  AlertTriangle,
  Plus,
  Trash2,
  Loader2,
  RefreshCw,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const GerenciarAlertas = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [selectedUser, setSelectedUser] = useState('');
  const [message, setMessage] = useState('');

  const { data: users, isLoading: usersLoading } = useUsers();
  const { data: alerts, isLoading: alertsLoading, refetch, isRefetching } = useAdminAlerts();
  const createAlertMutation = useCreateAdminAlert();
  const deleteAlertMutation = useDeleteAdminAlert();

  if (!user || user.role !== 'admin') return null;

  const nonAdminUsers = users?.filter(u => u.role !== 'admin') || [];

  const handleCreateAlert = async () => {
    if (!selectedUser || !message.trim()) {
      toast.error('Selecione um usuário e escreva uma mensagem');
      return;
    }

    try {
      await createAlertMutation.mutateAsync({
        target_user_id: selectedUser,
        message: message.trim(),
      });
      toast.success('Alerta criado');
      setSelectedUser('');
      setMessage('');
    } catch (error) {
      toast.error('Erro ao criar alerta');
    }
  };

  const handleDelete = async (alertId: string) => {
    try {
      await deleteAlertMutation.mutateAsync(alertId);
      toast.success('Alerta removido');
    } catch (error) {
      toast.error('Erro ao remover alerta');
    }
  };

  const formatDate = (date: string) => {
    return format(new Date(date), "dd/MM/yyyy HH:mm", { locale: ptBR });
  };

  const getUserName = (userId: string) => {
    return users?.find(u => u.id === userId)?.name || 'Desconhecido';
  };

  const isLoading = usersLoading || alertsLoading;

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate('/dashboard')}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-semibold text-foreground">Gerenciar Alertas</h1>
              <p className="text-muted-foreground">Criar alertas para usuários</p>
            </div>
          </div>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => refetch()}
            disabled={isRefetching}
          >
            <RefreshCw className={cn("h-4 w-4", isRefetching && "animate-spin")} />
            Atualizar
          </Button>
        </div>

        {/* Create alert */}
        <div className="card-static p-6 space-y-4">
          <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-600" />
            Criar Novo Alerta
          </h2>
          
          <div className="space-y-2">
            <Label>Usuário</Label>
            <Select value={selectedUser} onValueChange={setSelectedUser} disabled={usersLoading}>
              <SelectTrigger>
                <SelectValue placeholder={usersLoading ? "Carregando..." : "Selecione um usuário"} />
              </SelectTrigger>
              <SelectContent>
                {nonAdminUsers.map((u) => (
                  <SelectItem key={u.id} value={u.id}>
                    {u.name} ({u.email})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Mensagem</Label>
            <Textarea
              placeholder="Digite a mensagem do alerta..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={3}
              maxLength={500}
            />
            <p className="text-xs text-muted-foreground">{message.length}/500</p>
          </div>

          <Button onClick={handleCreateAlert} disabled={createAlertMutation.isPending}>
            {createAlertMutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Plus className="h-4 w-4" />
            )}
            Criar Alerta
          </Button>
        </div>

        {/* Info */}
        <div className="card-static p-4 bg-amber-50 border-amber-200">
          <p className="text-sm text-amber-800">
            Alertas aparecem em destaque amarelo no topo do dashboard do usuário.
          </p>
        </div>

        {/* Loading state */}
        {isLoading && (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        )}

        {/* Existing alerts */}
        {!isLoading && (
          <div className="space-y-3">
            <h2 className="text-lg font-semibold text-foreground">Alertas Ativos</h2>
            
            {!alerts || alerts.length === 0 ? (
              <div className="text-center py-8">
                <AlertTriangle className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
                <p className="text-muted-foreground">Nenhum alerta ativo</p>
              </div>
            ) : (
              alerts.map((alert, index) => (
                <div 
                  key={alert.id} 
                  className="card-static p-4 bg-amber-50 border-amber-200 opacity-0 animate-fade-in"
                  style={{ animationDelay: `${index * 30}ms` }}
                >
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5" />
                    <div className="flex-1">
                      <p className="font-medium text-amber-800">{getUserName(alert.target_user_id)}</p>
                      <p className="text-sm text-amber-700 mt-1">{alert.message}</p>
                      <p className="text-xs text-amber-600 mt-2">
                        {formatDate(alert.created_at)}
                      </p>
                    </div>
                    <Button 
                      variant="ghost" 
                      size="icon-sm" 
                      onClick={() => handleDelete(alert.id)}
                      disabled={deleteAlertMutation.isPending}
                    >
                      <Trash2 className="h-4 w-4 text-amber-700" />
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </AppLayout>
  );
};

export default GerenciarAlertas;
