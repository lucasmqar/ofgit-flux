import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useCreateRating } from '@/hooks/useRatings';
import { toast } from 'sonner';
import { Star, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface RatingModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  orderId: string;
  fromUserId: string;
  toUserId: string;
  toUserName: string;
  roleLabel: string; // "entregador" ou "empresa"
}

export const RatingModal: React.FC<RatingModalProps> = ({
  open,
  onOpenChange,
  orderId,
  fromUserId,
  toUserId,
  toUserName,
  roleLabel,
}) => {
  const [stars, setStars] = useState(5);
  const [hoverStars, setHoverStars] = useState(0);
  const [comment, setComment] = useState('');
  const createRating = useCreateRating();

  const handleSubmit = async () => {
    try {
      await createRating.mutateAsync({
        order_id: orderId,
        from_user_id: fromUserId,
        to_user_id: toUserId,
        stars,
        comment: comment.trim() || null,
      });
      toast.success('Avaliação enviada!');
      onOpenChange(false);
      setStars(5);
      setComment('');
    } catch (error) {
      toast.error('Erro ao enviar avaliação');
    }
  };

  const displayStars = hoverStars || stars;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Avaliar {roleLabel}</DialogTitle>
          <DialogDescription>
            Como foi sua experiência com <strong>{toUserName}</strong>?
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Stars */}
          <div className="flex justify-center gap-1">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                type="button"
                onMouseEnter={() => setHoverStars(star)}
                onMouseLeave={() => setHoverStars(0)}
                onClick={() => setStars(star)}
                className="p-1 transition-transform hover:scale-110"
              >
                <Star
                  className={cn(
                    'h-8 w-8 transition-colors',
                    star <= displayStars
                      ? 'fill-amber-400 text-amber-400'
                      : 'text-muted-foreground/30'
                  )}
                />
              </button>
            ))}
          </div>

          <p className="text-center text-sm text-muted-foreground">
            {displayStars === 1 && 'Péssimo'}
            {displayStars === 2 && 'Ruim'}
            {displayStars === 3 && 'Regular'}
            {displayStars === 4 && 'Bom'}
            {displayStars === 5 && 'Excelente'}
          </p>

          {/* Comment */}
          <Textarea
            placeholder="Deixe um comentário (opcional)"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            rows={3}
            maxLength={200}
          />
          <p className="text-xs text-muted-foreground text-right">{comment.length}/200</p>

          {/* Submit */}
          <Button
            className="w-full"
            onClick={handleSubmit}
            disabled={createRating.isPending}
          >
            {createRating.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              'Enviar Avaliação'
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
