# Deploy das Edge Functions do Supabase

## Problema Identificado

As Edge Functions foram reescritas localmente para remover a dependência do Stripe SDK (que causava erro `runMicrotasks`), mas **NUNCA foram deployadas** no Supabase. O código em produção ainda está com a versão antiga, causando os erros 401 na função `create-stripe-checkout`.

## Como Fazer o Deploy

### Opção 1: Via Supabase CLI (Recomendado)

```powershell
# Instalar Supabase CLI (se ainda não tiver)
scoop install supabase

# Ou via npm
npm install -g supabase

# Login no Supabase
supabase login

# Link com o projeto (use o Project ID do dashboard)
supabase link --project-ref SEU_PROJECT_ID

# Deploy das Edge Functions
supabase functions deploy create-stripe-checkout
supabase functions deploy stripe-webhook

# Verificar deploy
supabase functions list
```

### Opção 2: Via Supabase Dashboard (Manual)

1. Acesse: https://supabase.com/dashboard/project/SEU_PROJECT_ID/functions
2. Clique em "Create a new function" ou edite as funções existentes
3. Copie o código dos arquivos:
   - `supabase/functions/create-stripe-checkout/index.ts`
   - `supabase/functions/stripe-webhook/index.ts`
4. Cole no editor do dashboard e clique em "Deploy"

## Verificar Variáveis de Ambiente

No Supabase Dashboard > Settings > Edge Functions, verifique se estas variáveis estão configuradas:

- `STRIPE_SECRET_KEY` - Sua chave secreta do Stripe
- `STRIPE_WEBHOOK_SECRET` - Secret para validar webhooks do Stripe
- `STRIPE_PAYMENT_METHOD_TYPES` - (Opcional) Padrão: "card"
- `SUPABASE_URL` - (Automático)
- `SUPABASE_ANON_KEY` - (Automático)
- `SUPABASE_SERVICE_ROLE_KEY` - (Automático)

## Configurar Webhook no Stripe

Após fazer o deploy da função `stripe-webhook`, adicione este endpoint no Stripe Dashboard:

1. Acesse: https://dashboard.stripe.com/webhooks
2. Clique em "Add endpoint"
3. URL: `https://SEU_PROJECT_ID.supabase.co/functions/v1/stripe-webhook`
4. Eventos: Selecione:
   - `checkout.session.completed`
   - `payment_intent.succeeded`
5. Copie o "Signing secret" e adicione como `STRIPE_WEBHOOK_SECRET` no Supabase

## Testar o Deploy

Após fazer o deploy:

1. Acesse https://iflux.space
2. Clique em "ASSINAR" em um dos planos
3. Faça login ou crie uma conta
4. Verifique se o checkout do Stripe abre corretamente (não deve dar 401)

## Logs e Debugging

Para ver os logs das Edge Functions:

```powershell
# Via CLI
supabase functions logs create-stripe-checkout
supabase functions logs stripe-webhook

# Via Dashboard
# Acesse: Functions > Logs
```

## Rollback (Se Necessário)

Se o deploy causar problemas, você pode fazer rollback via Dashboard:
1. Acesse: Functions > create-stripe-checkout > Deployments
2. Selecione uma versão anterior e clique em "Rollback"

---

**IMPORTANTE**: Sem fazer este deploy, o site institucional continuará com erro 401 ao tentar criar checkout do Stripe!
