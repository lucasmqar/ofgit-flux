import { useState } from 'react';
import { useValidateDeliveryCode } from '@/hooks/useDeliveryValidation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { 
  Shield, 
  CheckCircle2, 
  XCircle, 
  Loader2,
  Lock,
  AlertTriangle,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface DeliveryCodeValidationProps {
  deliveryId: string;
  driverUserId: string;
  isValidated: boolean;
  validationAttempts: number;
  onValidated?: () => void;
}

export const DeliveryCodeValidation = ({
  deliveryId,
  driverUserId,
  isValidated,
  validationAttempts,
  onValidated,
}: DeliveryCodeValidationProps) => {
  const [code, setCode] = useState('');
  const validateMutation = useValidateDeliveryCode();

  const handleValidate = async () => {
    if (code.length !== 6) {
      toast.error('O código deve ter 6 caracteres');
      return;
    }

    try {
      await validateMutation.mutateAsync({
        deliveryId,
        code,
        driverUserId,
      });
      toast.success('Código validado com sucesso!');
      onValidated?.();
    } catch (error: any) {
      toast.error(error.message || 'Erro ao validar código');
    }
  };

  const remainingAttempts = 5 - validationAttempts;
  const isBlocked = remainingAttempts <= 0;

  if (isValidated) {
    return (
      <div className="flex items-center gap-3 p-4 rounded-lg bg-emerald-50 border border-emerald-200 dark:bg-emerald-900/30 dark:border-emerald-800">
        <CheckCircle2 className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
        <div>
          <p className="font-medium text-emerald-800 dark:text-emerald-300">Entrega Validada</p>
          <p className="text-sm text-emerald-600 dark:text-emerald-400">Código verificado com sucesso</p>
        </div>
      </div>
    );
  }

  if (isBlocked) {
    return (
      <div className="flex items-center gap-3 p-4 rounded-lg bg-destructive/10 border border-destructive/30">
        <Lock className="h-6 w-6 text-destructive" />
        <div>
          <p className="font-medium text-destructive">Validação Bloqueada</p>
          <p className="text-sm text-muted-foreground">Limite de tentativas excedido. Contate a empresa.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 p-4 rounded-lg bg-secondary/30 border border-border">
      <div className="flex items-center gap-3">
        <Shield className="h-6 w-6 text-primary" />
        <div>
          <p className="font-medium text-foreground">Validar Entrega</p>
          <p className="text-sm text-muted-foreground">
            Insira o código de 6 dígitos fornecido pelo cliente
          </p>
        </div>
      </div>

      {remainingAttempts <= 2 && (
        <div className="flex items-center gap-2 text-amber-600 bg-amber-50 p-2 rounded-lg dark:bg-amber-900/30 dark:text-amber-400">
          <AlertTriangle className="h-4 w-4" />
          <span className="text-sm">
            Atenção: {remainingAttempts} tentativa{remainingAttempts !== 1 ? 's' : ''} restante{remainingAttempts !== 1 ? 's' : ''}
          </span>
        </div>
      )}

      <div className="flex gap-3">
        <Input
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6))}
          placeholder="ABC123"
          maxLength={6}
          className={cn(
            "text-center text-2xl font-mono tracking-[0.5em] uppercase",
            "h-14 px-4"
          )}
          disabled={validateMutation.isPending}
        />
        <Button
          onClick={handleValidate}
          disabled={code.length !== 6 || validateMutation.isPending}
          size="lg"
          className="h-14 px-6"
        >
          {validateMutation.isPending ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            <CheckCircle2 className="h-5 w-5" />
          )}
          Validar
        </Button>
      </div>

      <p className="text-xs text-muted-foreground text-center">
        O código é único e foi enviado para o cliente final
      </p>
    </div>
  );
};
