import { AppLayout } from '@/components/AppLayout';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { useAverageRating, useRatings } from '@/hooks/useRatings';
import { useCompanyProfile } from '@/hooks/useCompanyProfiles';
import { useDriverProfile } from '@/hooks/useDriverProfiles';
import { useProfile, useUserRole } from '@/hooks/useProfile';
import { cn } from '@/lib/utils';
import { Star, ArrowLeft, User, Building2, Truck, Phone, MapPin, Loader2 } from 'lucide-react';
import { useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

const roleLabel: Record<string, string> = {
  admin: 'Administrador',
  company: 'Empresa',
  driver: 'Entregador',
};

const Stars = ({ value }: { value: number }) => {
  const clamped = Math.max(0, Math.min(5, value));
  const full = Math.floor(clamped);
  const half = clamped - full >= 0.5;

  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((i) => {
        const filled = i <= full;
        const semi = !filled && half && i === full + 1;
        return (
          <Star
            key={i}
            className={cn(
              'h-4 w-4',
              filled || semi ? 'fill-amber-400 text-amber-400' : 'text-muted-foreground/30'
            )}
          />
        );
      })}
    </div>
  );
};

const UsuarioPerfil = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { id: userId } = useParams<{ id: string }>();

  const { data: profile, isLoading: profileLoading } = useProfile(userId);
  const { data: role, isLoading: roleLoading } = useUserRole(userId);
  const { data: companyProfile } = useCompanyProfile(role === 'company' ? userId : undefined);
  const { data: driverProfile } = useDriverProfile(role === 'driver' ? userId : undefined);

  const { data: ratings = [], isLoading: ratingsLoading } = useRatings(userId);
  const { data: avg, isLoading: avgLoading } = useAverageRating(userId);

  const isLoading = profileLoading || roleLoading || ratingsLoading || avgLoading;

  const averageLabel = useMemo(() => {
    if (!avg || ratings.length === 0) return 'Sem avaliações';
    return `${avg.toFixed(1)} / 5.0`;
  }, [avg, ratings.length]);

  if (!user) return null;

  return (
    <AppLayout>
      <div className="space-y-6 overflow-x-hidden">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1">
            <h1 className="text-2xl font-semibold text-foreground">Perfil</h1>
            <p className="text-muted-foreground text-sm">Avaliações e informações do usuário</p>
          </div>
        </div>

        {isLoading && (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        )}

        {!isLoading && !profile && (
          <div className="card-static p-4">
            <p className="text-sm text-muted-foreground">Usuário não encontrado.</p>
          </div>
        )}

        {!isLoading && profile && (
          <>
            <div className="card-static p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-12 h-12 rounded-full bg-secondary flex items-center justify-center shrink-0">
                    {role === 'company' ? (
                      <Building2 className="h-6 w-6 text-blue-600" />
                    ) : role === 'driver' ? (
                      <Truck className="h-6 w-6 text-emerald-600" />
                    ) : (
                      <User className="h-6 w-6 text-muted-foreground" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold text-foreground truncate">{profile.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {role ? roleLabel[role] ?? role : 'Usuário'}
                    </p>
                  </div>
                </div>

                <div className="text-right">
                  <p className="text-xs text-muted-foreground">Média</p>
                  <div className="flex items-center justify-end gap-2">
                    <Stars value={avg ?? 0} />
                    <span className="text-sm font-medium text-foreground">{averageLabel}</span>
                  </div>
                  <p className="text-xs text-muted-foreground">{ratings.length} avaliação(ões)</p>
                </div>
              </div>

              {(profile.phone || companyProfile?.address_default || driverProfile?.city) && (
                <div className="mt-4 grid grid-cols-1 gap-2">
                  {profile.phone && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Phone className="h-4 w-4" />
                      <span>{profile.phone}</span>
                    </div>
                  )}
                  {companyProfile?.address_default && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <MapPin className="h-4 w-4" />
                      <span>{companyProfile.address_default}</span>
                    </div>
                  )}
                  {driverProfile?.city && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <MapPin className="h-4 w-4" />
                      <span>
                        {driverProfile.city}
                        {driverProfile.state ? ` - ${driverProfile.state}` : ''}
                      </span>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="card-static p-4">
              <h2 className="text-lg font-semibold text-foreground mb-3">Avaliações</h2>

              {ratings.length === 0 ? (
                <p className="text-sm text-muted-foreground">Este usuário ainda não possui avaliações.</p>
              ) : (
                <div className="space-y-3">
                  {ratings.map((r) => (
                    <div key={r.id} className="p-3 rounded-lg border border-border bg-background">
                      <div className="flex items-center justify-between gap-3">
                        <Stars value={r.stars ?? 0} />
                        <span className="text-xs text-muted-foreground">
                          {r.created_at ? new Date(r.created_at).toLocaleDateString('pt-BR') : ''}
                        </span>
                      </div>
                      {r.comment && (
                        <p className="mt-2 text-sm text-foreground">{r.comment}</p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </AppLayout>
  );
};

export default UsuarioPerfil;
