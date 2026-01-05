import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { AppLayout } from '@/components/AppLayout';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { ArrowLeft, Bell, Lightbulb, Info, Moon, Sun, Monitor, Smartphone, CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { useTheme } from 'next-themes';
import { cn } from '@/lib/utils';
import { PushNotificationService } from '@/services/pushNotifications';
import { supabase } from '@/integrations/supabase/client';
import { Capacitor } from '@capacitor/core';

const Configuracoes = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  
  const [showTips, setShowTips] = useState(() => {
    const saved = localStorage.getItem('flux_show_tips');
    return saved !== 'false';
  });
  
  const [soundNotifications, setSoundNotifications] = useState(() => {
    const saved = localStorage.getItem('flux_sound_notifications');
    return saved !== 'false';
  });
  
  const [popupNotifications, setPopupNotifications] = useState(() => {
    const saved = localStorage.getItem('flux_popup_notifications');
    return saved !== 'false';
  });

  // Push notification debug state
  const [pushToken, setPushToken] = useState<string | null>(null);
  const [isCheckingPush, setIsCheckingPush] = useState(false);
  const [pushStatus, setPushStatus] = useState<{
    isNative: boolean;
    hasToken: boolean;
    tokenInDb: boolean;
    permissionGranted: boolean;
  } | null>(null);

  // Avoid hydration mismatch
  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    localStorage.setItem('flux_show_tips', String(showTips));
  }, [showTips]);
  
  useEffect(() => {
    localStorage.setItem('flux_sound_notifications', String(soundNotifications));
  }, [soundNotifications]);
  
  useEffect(() => {
    localStorage.setItem('flux_popup_notifications', String(popupNotifications));
  }, [popupNotifications]);

  // Check push notification status
  const checkPushStatus = async () => {
    if (!user) return;
    
    setIsCheckingPush(true);
    
    // Initialize with default values
    let statusResult = {
      isNative: false,
      hasToken: false,
      tokenInDb: false,
      permissionGranted: false,
    };
    
    try {
      const isNative = Capacitor.isNativePlatform();
      console.log('Is native platform:', isNative);
      statusResult.isNative = isNative;
      
      const service = PushNotificationService.getInstance();
      
      // Check if token exists in service
      const token = service.getToken();
      console.log('Token from service:', token ? token.substring(0, 20) + '...' : 'null');
      setPushToken(token);
      statusResult.hasToken = !!token;
      
      // Check if token is in database
      if (token) {
        try {
          const { data, error } = await supabase
            .from('user_push_tokens')
            .select('token')
            .eq('user_id', user.id)
            .eq('token', token)
            .maybeSingle();
          
          if (error) {
            console.error('Error checking token in DB:', error);
          } else {
            statusResult.tokenInDb = !!data;
            console.log('Token in DB:', statusResult.tokenInDb);
          }
        } catch (dbError) {
          console.error('Database check failed:', dbError);
        }
      }
      
      // Check permission status (only on native)
      if (isNative) {
        try {
          const { PushNotifications } = await import('@capacitor/push-notifications');
          const permStatus = await PushNotifications.checkPermissions();
          console.log('Permission status:', permStatus);
          statusResult.permissionGranted = permStatus.receive === 'granted';
        } catch (error) {
          console.error('Error checking permissions:', error);
        }
      }
      
      setPushStatus(statusResult);
      
      if (!isNative) {
        toast.info('Notificações push só funcionam no aplicativo nativo');
      } else if (token && statusResult.tokenInDb) {
        toast.success('Status verificado! Sistema configurado corretamente.');
      } else if (token && !statusResult.tokenInDb) {
        toast.warning('Token encontrado mas não salvo no banco. Tentando salvar...');
        // Try to save token again
        await service.initialize(user.id);
      } else {
        toast.warning('Token FCM não encontrado. Solicite permissões.');
      }
    } catch (error: any) {
      console.error('Error checking push status:', error);
      toast.error('Erro ao verificar status: ' + error.message);
      setPushStatus(statusResult); // Set default values even on error
    } finally {
      setIsCheckingPush(false);
    }
  };

  // Request push permissions
  const requestPushPermissions = async () => {
    if (!user) {
      toast.error('Usuário não autenticado');
      return;
    }

    if (!Capacitor.isNativePlatform()) {
      toast.error('Notificações push só funcionam no aplicativo nativo');
      return;
    }

    try {
      console.log('Requesting push permissions for user:', user.id);
      const service = PushNotificationService.getInstance();
      await service.initialize(user.id);
      
      // Wait a bit for token registration
      setTimeout(async () => {
        await checkPushStatus();
      }, 2000);
      
      toast.success('Permissões solicitadas! Aguarde a verificação...');
    } catch (error: any) {
      console.error('Error requesting permissions:', error);
      toast.error('Erro ao solicitar permissões: ' + error.message);
    }
  };

  // Send test notification
  const sendTestNotification = async () => {
    if (!user) {
      toast.error('Usuário não autenticado');
      return;
    }
    
    if (!pushToken) {
      toast.error('Token FCM não disponível. Solicite permissões primeiro.');
      return;
    }
    
    try {
      console.log('=== SENDING TEST NOTIFICATION ===');
      console.log('User ID:', user.id);
      console.log('Token:', pushToken.substring(0, 30) + '...');
      
      // Check if we have a valid session
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      console.log('Session check:', sessionError ? 'ERROR: ' + sessionError.message : 'OK');
      console.log('Access token exists:', !!sessionData?.session?.access_token);
      
      if (!sessionData?.session?.access_token) {
        toast.error('Sessão expirada. Faça login novamente.');
        return;
      }
      
      const payload = {
        title: '🧪 Teste de Notificação',
        body: 'Esta é uma notificação de teste do FLUX!',
        user_ids: [user.id],
        data: {
          type: 'test',
          timestamp: new Date().toISOString(),
        },
      };
      
      console.log('Payload:', JSON.stringify(payload, null, 2));
      console.log('Calling Edge Function...');
      
      const { data, error } = await supabase.functions.invoke('send-push-notification', {
        body: payload,
        headers: {
          Authorization: `Bearer ${sessionData.session.access_token}`,
        },
      });
      
      console.log('Edge Function response:', { data, error });
      
      if (error) {
        console.error('Edge function error:', error);
        console.error('Error details:', JSON.stringify(error, null, 2));
        
        // Check if it's a configuration error
        if (error.message?.includes('secret')) {
          toast.error('Erro: FIREBASE_SERVICE_ACCOUNT não configurado no Supabase');
        } else if (error.message?.includes('FunctionsHttpError')) {
          toast.error('Erro HTTP na Edge Function: ' + (error.context?.status || 'unknown'));
        } else if (error.message?.includes('FunctionsRelayError')) {
          toast.error('Erro de conexão com Edge Function');
        } else {
          toast.error('Erro na Edge Function: ' + error.message);
        }
        return;
      }
      
      console.log('Test notification response:', data);
      
      if (data?.sent > 0) {
        toast.success(`Notificação enviada para ${data.sent} dispositivo(s)!`);
      } else if (data?.sent === 0) {
        toast.warning('Nenhum token encontrado. Verifique se o token está no banco.');
      } else {
        toast.success('Notificação de teste enviada! Verifique seu dispositivo.');
      }
    } catch (error: any) {
      console.error('Error sending test notification:', error);
      toast.error('Erro ao enviar: ' + (error.message || 'Erro desconhecido'));
    }
  };

  if (!user) return null;

  const handleSave = () => {
    toast.success('Configurações salvas');
  };

  const themeOptions = [
    { value: 'light', label: 'Claro', icon: Sun },
    { value: 'dark', label: 'Escuro', icon: Moon },
    { value: 'system', label: 'Sistema', icon: Monitor },
  ];

  return (
    <AppLayout>
      <div className="max-w-2xl mx-auto space-y-6 overflow-x-hidden">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Configurações</h1>
            <p className="text-muted-foreground">Personalize sua experiência</p>
          </div>
        </div>

        {/* Theme Selection */}
        <div className="card-static p-6 animate-fade-in">
          <div className="flex items-center gap-2 mb-4">
            {mounted && theme === 'dark' ? (
              <Moon className="h-5 w-5 text-primary" />
            ) : (
              <Sun className="h-5 w-5 text-primary" />
            )}
            <h2 className="text-lg font-semibold text-foreground">Aparência</h2>
          </div>
          
          <div className="space-y-3">
            <Label>Tema do aplicativo</Label>
            <div className="grid grid-cols-3 gap-2">
              {themeOptions.map((option) => {
                const isSelected = mounted && theme === option.value;
                return (
                  <button
                    key={option.value}
                    onClick={() => setTheme(option.value)}
                    className={cn(
                      "flex flex-col items-center gap-2 p-4 rounded-xl border transition-all",
                      isSelected
                        ? "border-primary bg-primary/10 ring-2 ring-primary/20"
                        : "border-border bg-background hover:bg-secondary/50"
                    )}
                  >
                    <option.icon className={cn(
                      "h-6 w-6",
                      isSelected ? "text-primary" : "text-muted-foreground"
                    )} />
                    <span className={cn(
                      "text-sm font-medium",
                      isSelected ? "text-primary" : "text-muted-foreground"
                    )}>
                      {option.label}
                    </span>
                  </button>
                );
              })}
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              O tema "Sistema" segue automaticamente as configurações do seu dispositivo.
            </p>
          </div>
        </div>

        {/* Notifications */}
        <div className="card-static p-6 animate-fade-in" style={{ animationDelay: '50ms' }}>
          <div className="flex items-center gap-2 mb-4">
            <Bell className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-semibold text-foreground">Notificações</h2>
          </div>
          
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="popup-notifications">Notificações Pop-up</Label>
                <p className="text-xs text-muted-foreground">
                  Receba alertas visuais quando houver atualizações
                </p>
              </div>
              <Switch
                id="popup-notifications"
                checked={popupNotifications}
                onCheckedChange={setPopupNotifications}
              />
            </div>
            
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="sound-notifications">Som de Notificação</Label>
                <p className="text-xs text-muted-foreground">
                  Ative sons para novas entregas e atualizações
                </p>
              </div>
              <Switch
                id="sound-notifications"
                checked={soundNotifications}
                onCheckedChange={setSoundNotifications}
              />
            </div>
          </div>
        </div>

        {/* Tips */}
        <div className="card-static p-6 animate-fade-in" style={{ animationDelay: '100ms' }}>
          <div className="flex items-center gap-2 mb-4">
            <Lightbulb className="h-5 w-5 text-amber-500" />
            <h2 className="text-lg font-semibold text-foreground">Dicas e Instruções</h2>
          </div>
          
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="show-tips">Mostrar Dicas</Label>
                <p className="text-xs text-muted-foreground">
                  Exibe instruções e orientações em todas as telas
                </p>
              </div>
              <Switch
                id="show-tips"
                checked={showTips}
                onCheckedChange={setShowTips}
              />
            </div>
          </div>
        </div>

        {/* Info */}
        <div className="card-static p-6 animate-fade-in" style={{ animationDelay: '150ms' }}>
          <div className="flex items-center gap-2 mb-4">
            <Info className="h-5 w-5 text-blue-500" />
            <h2 className="text-lg font-semibold text-foreground">Sobre o App</h2>
          </div>
          
          <div className="space-y-2 text-sm text-muted-foreground">
            <p><strong>FLUX</strong> - Entregas Sob Demanda</p>
            <p>Versão: 1.0.0</p>
            <p>© 2025 FLUX. Todos os direitos reservados.</p>
          </div>
        </div>

        <Button className="w-full" onClick={handleSave}>
          Salvar Configurações
        </Button>
      </div>
    </AppLayout>
  );
};

export default Configuracoes;
