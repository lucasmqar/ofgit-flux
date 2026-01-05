# Stripe (Pacotes Fechados) + Supabase (credits)

Este projeto já usa a tabela `public.credits` (campo `valid_until`) para liberar/ bloquear o uso do app (`hasCredits`).

A estratégia mais simples é: **cada compra no Stripe = estende `credits.valid_until`**.

## O que foi adicionado no repo

- Migration: cria tabelas de billing e seeds de planos.
  - `supabase/migrations/20260103120000_add_stripe_billing_for_credits.sql`
  - Tabelas:
    - `public.billing_plans` (catálogo: role + duração + price id)
    - `public.billing_customers` (user_id → stripe_customer_id)
    - `public.billing_events` (idempotência do webhook)
- Edge Functions:
  - `supabase/functions/create-stripe-checkout` (gera Checkout Session)
  - `supabase/functions/stripe-webhook` (processa webhook e estende créditos)

## 1) Criar conta Stripe e configurar (do zero)

1. Crie uma conta Stripe e deixe em **Test Mode** por enquanto.
2. Configure **moeda BRL** e ative os métodos de pagamento que você quer oferecer.
   - Por padrão, esta implementação usa `card`.
   - Se for ativar Pix, depois você pode setar `STRIPE_PAYMENT_METHOD_TYPES=card,pix`.

## 2) Criar Products/Prices (Stripe)

Crie 1 produto (ex: "FLUX Acesso") e 8 preços (ou 2 produtos com 4 preços cada — tanto faz). O importante é você ter os `price_...`.

Planos seedados no banco (pode ajustar depois):
- `company_15d` = R$ 189,90 (15 dias)
- `company_30d` = R$ 389,90 (30 dias)
- `company_90d` = R$ 999,90 (90 dias)
- `company_180d` = R$ 1.999,90 (180 dias)
- `driver_15d` = R$ 89,90 (15 dias)
- `driver_30d` = R$ 169,90 (30 dias)
- `driver_90d` = R$ 489,90 (90 dias)
- `driver_180d` = R$ 899,90 (180 dias)

## 3) Preencher `stripe_price_id` no Supabase

Depois que você tiver os `price_...`, atualize os planos no Supabase:

```sql
update public.billing_plans set stripe_price_id = 'price_xxx' where key = 'company_30d';
```

Repita para os demais.

## 4) Configurar secrets e deploy das Edge Functions

No Supabase (CLI ou Dashboard), configure os secrets:

- `STRIPE_SECRET_KEY` (sk_test_...)
- `STRIPE_WEBHOOK_SECRET` (whsec_...)
- (opcional) `STRIPE_PAYMENT_METHOD_TYPES` (default: `card`)

Com CLI (exemplo):

```bash
supabase secrets set STRIPE_SECRET_KEY=sk_test_... STRIPE_WEBHOOK_SECRET=whsec_...
```

Deploy:

```bash
supabase functions deploy create-stripe-checkout
supabase functions deploy stripe-webhook
```

## 4.1) Testar Checkout em produção usando credenciais de teste

Você pode testar o Checkout em um domínio “de produção” (ex: `https://iflux.space`) usando **chaves de teste**, desde que:

- As Edge Functions estejam com `STRIPE_SECRET_KEY=sk_test_...`
- O webhook esteja com `STRIPE_WEBHOOK_SECRET=whsec_...` do **modo teste**
- Os planos em `public.billing_plans` usem **prices de teste** (`price_...` criados no Test Mode) **OU** `stripe_price_id` esteja vazio e a função use `price_data` (ver nota abaixo)

Pontos críticos:

- Não misture `sk_test_...` com `stripe_price_id` de live mode (isso dá erro do tipo “No such price”).
- Se você quer testar sem criar prices no Stripe, deixe `billing_plans.stripe_price_id` como `NULL` e mantenha `amount_cents` + `currency` preenchidos: a função `create-stripe-checkout` usa `price_data` automaticamente.

### Stripe “Restricted key” (modo restrito)

Se você estiver usando uma **Restricted API Key**, ela precisa (no mínimo) ter permissão para:

- Criar Customers
- Criar Checkout Sessions

Caso contrário, a Edge Function vai retornar erro do Stripe e o Checkout não abre.

### Webhook em teste

No Stripe Dashboard (Test Mode), crie o endpoint apontando para a sua Edge Function:

- `https://<PROJECT_REF>.functions.supabase.co/stripe-webhook`

E selecione os eventos:

- `checkout.session.completed`
- `checkout.session.async_payment_succeeded`

Use o `whsec_...` desse endpoint em `STRIPE_WEBHOOK_SECRET`.

## 5) Configurar Webhook no Stripe

Crie um endpoint de webhook apontando para:

- `https://<PROJECT_REF>.functions.supabase.co/stripe-webhook`

Assine eventos:
- `checkout.session.completed`
- `checkout.session.async_payment_succeeded`

(Os demais são ignorados.)

## 6) Como o fluxo funciona

- O site/app chama `create-stripe-checkout` com `{ planKey }` (usuário precisa estar logado no Supabase).
- A função cria um Checkout Session com `metadata.supabase_user_id` e `metadata.plan_key`.
- Quando o Stripe confirma pagamento (webhook), `stripe-webhook`:
  - Faz idempotência via `billing_events.stripe_event_id`
  - Busca `duration_days` do plano
  - Estende `credits.valid_until`:
    - base = `max(now(), credits.valid_until)`
    - novo = base + `duration_days`

## 7) Integração mínima com o site institucional (sem backend próprio)

O ponto crítico é **identificar o usuário**.

Caminho recomendado (mínimo):
- O botão "ASSINAR" no site institucional:
  1) força login via Supabase Auth (Google/email)
  2) depois chama a Edge Function `create-stripe-checkout`
  3) redireciona para `url` do Checkout

Você vai precisar:
- Incluir `@supabase/supabase-js` via CDN no site institucional, ou embutir um bundle.
- Configurar no Supabase Auth:
  - Redirect URL autorizado do domínio `https://iflux.space`.

Se você quiser, eu também posso te entregar um snippet JS pronto (1 arquivo) para colar no site institucional, com botão de login + compra.

Snippet pronto no repo: [scripts/institutional_auth_and_checkout.js](scripts/institutional_auth_and_checkout.js)

## Observação importante (Entregadores vs Empresas)

O Stripe não sabe o "role" real do usuário — isso vem do Supabase.
A função `create-stripe-checkout` bloqueia compra de plano com role diferente (exceto admin), para evitar confusão.
