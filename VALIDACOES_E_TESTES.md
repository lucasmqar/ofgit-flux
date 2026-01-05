# VALIDAÇÕES E TESTES - Sistema FLUX

## ✅ Checklist de Validação

### 1. **Banco de Dados - Schema Validation**

#### Tabelas Necessárias
- [ ] `profiles` (id, name, email, phone)
- [ ] `company_profiles` (user_id, company_name, cnpj, state, city)
- [ ] `driver_profiles` (user_id, vehicle_type, vehicle_model, plate, state, city)
- [ ] `user_roles` (user_id, role)
- [ ] `credits` (user_id, valid_until)
- [ ] `billing_plans` (key, role, duration_days, stripe_price_id, active, amount_cents, currency)
- [ ] `billing_customers` (user_id, stripe_customer_id)

#### Validações de Coluna
```sql
-- Verificar tipos de dados
SELECT column_name, data_type FROM information_schema.columns 
WHERE table_name IN ('profiles', 'company_profiles', 'driver_profiles');

-- Verificar constrainsts
SELECT constraint_name, table_name 
FROM information_schema.table_constraints 
WHERE table_name IN ('profiles', 'company_profiles', 'driver_profiles');
```

---

### 2. **Supabase Secrets - Environment Variables**

**Verificar em Supabase → Project Settings → API Keys:**

- [ ] `SUPABASE_URL` = `https://[project-id].supabase.co`
- [ ] `SUPABASE_ANON_KEY` = anon/public key (usado no cliente)
- [ ] `SUPABASE_SERVICE_ROLE_KEY` = service role key (usado na edge function)
- [ ] `STRIPE_SECRET_KEY` = sk_live_... ou sk_test_...
- [ ] `STRIPE_WEBHOOK_SECRET` = whsec_...

**Comando de Teste** (via curl/Insomnia):
```bash
curl -X POST https://[project-id].supabase.co/functions/v1/create-stripe-checkout \
  -H "Authorization: Bearer [ACCESS_TOKEN]" \
  -H "Content-Type: application/json" \
  -d '{"planKey":"company_15d"}'
```

---

### 3. **Login/Signup - Fluxo Passo a Passo**

#### Teste 1: Google OAuth
```
1. Abrir https://iflux.space
2. Ir para /login
3. Clicar em "Continuar com Google"
4. Autorizar
5. Se novo usuário → tela de "Escolha o tipo da sua conta"
6. Selecionar "Empresa" ou "Entregador"
7. Clicar "Continuar"
   └─ Deve chamar setMyRole() e ir para role profile completion screen
8. Preencher campos de empresa/entregador
9. Clicar "Salvar e Continuar"
   └─ Deve salvar em company_profiles/driver_profiles
   └─ Deve atualizar contexto
   └─ Deve redirecionar para /plano
```

**Esperado**:
- [ ] Profile criado em `profiles` table
- [ ] Dados de role (company/driver) salvos na tabela específica
- [ ] user_roles criado com role correto
- [ ] Redirecionamento para /plano após conclusão

---

#### Teste 2: Email/Senha - Novo Usuário
```
1. Abrir https://iflux.space/login (Tab: "Cadastro")
2. Selecionar role: "Empresa"
3. Preencher:
   - Email: test@example.com
   - Senha: Test@1234
   - Nome: João Silva
4. Clicar "Continuar com Email"
   └─ Deve ir para Step 2 (empresa fields)
5. Preencher:
   - Razão Social: Acme LTDA
   - CNPJ: 12.345.678/0001-90
   - Cidade: Goiânia
6. Clicar "Salvar e Continuar"
   └─ Deve executar handleCompleteProfile()
```

**Esperado**:
- [ ] Perfil criado em `profiles` com name, email
- [ ] Dados de empresa salvos em `company_profiles`:
  - `cnpj` deve ser "12345678000190" (sem \D)
  - `state` deve ser "GO"
  - `city` deve ser "Goiânia"
- [ ] Toast "✅ Perfil salvo! Processando..."
- [ ] Redirecionamento para /plano

**Debugging**:
```javascript
// No console do navegador
localStorage.getItem('sb-[project-id]-auth-token')  // Verificar token
sessionStorage.getItem('pendingCheckoutPlanKey')    // Verificar plano pendente
```

---

### 4. **Checkout - Fluxo Completo**

#### Teste 1: Criar Checkout Direto (Admin)
```
1. Estar logado como admin
2. POST /functions/v1/create-stripe-checkout
   - Header: Authorization: Bearer [TOKEN]
   - Body: {"planKey":"company_15d"}
3. Esperado: 200 OK com {"success":true, "url":"https://checkout.stripe.com/..."}
```

**Esperado**:
- [ ] Response 200 OK
- [ ] Campo "url" contém link Stripe válido
- [ ] Redireciona para checkout.stripe.com

#### Teste 2: Checkout Após Signup (User Flow)
```
1. Home → Clica "Plano Empresa 15d"
2. Redireciona para /login com pending plan
3. Preenche signup
4. Após "Salvar e Continuar"
   └─ Detecta pendingCheckoutPlanKey
   └─ Chama startCheckoutIfPending()
   └─ Chama createStripeCheckout("company_15d")
5. Edge function retorna URL Stripe
6. Browser redireciona para checkout
```

**Esperado**:
- [ ] Sem erro "auth_refresh_timeout" (aumentado para 15s)
- [ ] Stripe modal abre
- [ ] Pode completar pagamento

---

### 5. **Edge Function - Validações Internas**

**Validar cada erro esperado:**

```typescript
// Teste 1: Sem Authorization header
// Response: 401 {"success":false, "error":"Missing Authorization header"}

// Teste 2: Token inválido/expirado
// Response: 401 {"success":false, "error":"Unauthorized"}

// Teste 3: Profile incompleto (sem phone)
// Response: 403 {"success":false, "error":"Complete your profile before checkout"}

// Teste 4: Company profile incompleto (sem cnpj)
// Response: 403 {"success":false, "error":"Complete company profile before checkout"}

// Teste 5: Plan não existe
// Response: 404 {"success":false, "error":"Plan not found"}

// Teste 6: Role mismatch (user=driver, plan=company)
// Response: 403 {"success":false, "error":"Plan does not match your role"}
```

**Como debugar**:
1. Ir para Supabase Dashboard → Edge Functions → create-stripe-checkout
2. Clicar em execution logs
3. Procurar por `console.error()` statements
4. Verificar timestamps com tempo da tentativa de checkout

---

### 6. **Conta (/conta) - Exibição de Dados**

#### Teste 1: Company User
```
1. Login como company user (completo)
2. Ir para /conta
3. Deverá exibir:
   ├─ Seção: Dados Pessoais
   │  ├─ Nome: [preenchido]
   │  ├─ Email: [preenchido]
   │  ├─ Telefone: [preenchido]
   │  └─ Cidade/Estado: [preenchido]
   ├─ Seção: Tipo de Conta
   │  └─ Badge "Empresa" (com ícone Building2)
   └─ Seção: Dados da Empresa
      ├─ Razão Social: [preenchido]
      └─ CNPJ: [formatado para display: 12.345.678/0001-90]
```

**Esperado**:
- [ ] Todos os campos preenchidos (sem "-")
- [ ] CNPJ formatado com pontos/barras para leitura
- [ ] Ícones aparecendo ao lado de labels
- [ ] Responsive (1 coluna mobile, 2 desktop)

#### Teste 2: Driver User
```
1. Login como driver user (completo)
2. Ir para /conta
3. Deverá exibir:
   ├─ [Dados Pessoais - igual acima]
   ├─ [Tipo de Conta - Badge "Entregador"]
   └─ Seção: Dados do Veículo
      ├─ Tipo: [Moto/Carro/Bicicleta]
      ├─ Modelo: [preenchido]
      └─ Placa: [formatada para display: ABC-1234]
```

**Esperado**:
- [ ] Vehicle type em português (Moto, Carro, Bicicleta)
- [ ] Placa formatada com hífen
- [ ] Todos os campos preenchidos

---

### 7. **Plano (/plano) - Status e Validade**

#### Teste 1: Usuário com Crédito Ativo
```
1. Login como user com créditos válidos
2. Ir para /plano
3. Deverá exibir:
   ├─ Status: ✅ Ativo (fundo verde + CheckCircle)
   └─ Válido até: [data/hora formatada em pt-BR]
```

**Esperado**:
- [ ] Badge "Ativo" com cor verde
- [ ] Data formatada em português (ex: "3 de janeiro de 2026 às 10:30")
- [ ] Botão "Renovar Plano" funcional

#### Teste 2: Usuário SEM Crédito / Expirado
```
1. Login como user sem créditos
2. Ir para /plano
3. Deverá exibir:
   ├─ Status: ⚠️ Inativo (fundo amarelo + AlertCircle)
   └─ Válido até: -
```

**Esperado**:
- [ ] Badge "Inativo" com cor amarela
- [ ] Mensagem clara "Seu plano expirou"
- [ ] Botão "Renovar Plano" bem visível

---

### 8. **Logout - Funcionamento**

#### Teste 1: Logout Desktop
```
1. Ir para /conta (logged in)
2. No header, clicar em ícone de logout (LogOut icon)
3. Deverá:
   ├─ Limpar sessionStorage de auth
   ├─ Limpar contexto (session, user, profile, role, credits)
   └─ Redirecionar para /
```

**Esperado**:
- [ ] Sem toast de erro
- [ ] Redireciona instantaneamente
- [ ] Botão de logout desaparece do header
- [ ] localStorage não tem auth token

#### Teste 2: Logout Mobile
```
1. Ir para /conta em device mobile
2. Abrir menu hamburger (top right)
3. Clicar em logout (LogOut icon)
4. Deverá funcionar igual ao desktop
```

**Esperado**:
- [ ] Menu fecha após click
- [ ] Redireciona para home
- [ ] Sem erros no console

---

### 9. **Responsividade - Mobile vs Desktop**

#### Teste 1: Font Sizing
```
1. Abrir /conta em:
   - Desktop (1920x1080)
   - Tablet (768x1024)
   - Mobile (375x667)
2. Verificar:
   ├─ Títulos legíveis em todos os tamanhos
   ├─ Labels (Dados Pessoais, etc) não truncados
   ├─ Campos de dados não overflow
   └─ Ícones alinhados com texto
```

**Esperado**:
- [ ] Em mobile: text-base mínimo para labels
- [ ] Grid muda de 1 coluna (mobile) para 2 colunas (desktop)
- [ ] Sem horizontal scrollbar

#### Teste 2: Buttons
```
1. Testar buttons em /conta e /plano
2. Verificar:
   ├─ Full-width em mobile
   ├─ Selecionáveis por touch
   ├─ Feedback visual ao click
   └─ Padding adequado para mobile
```

**Esperado**:
- [ ] Buttons >= 44px height (Apple standard)
- [ ] Hover effect em desktop
- [ ] Active effect em mobile

---

### 10. **Performance - Bundle e Loading**

#### Teste 1: Bundle Size
```
1. Abrir DevTools → Network
2. Recarregar https://iflux.space
3. Verificar:
   ├─ index.js: < 700 KB
   ├─ index.css: < 100 KB
   ├─ Total (com assets): < 1 MB
```

**Esperado**:
- [ ] Bundle size estável (1727 módulos)
- [ ] Sem aumentos repentinos (>50KB)

#### Teste 2: Load Time
```
1. Abrir DevTools → Performance
2. Recarregar página
3. Verificar:
   ├─ First Contentful Paint: < 2s
   ├─ Largest Contentful Paint: < 3s
   └─ Total page load: < 4s
```

**Esperado**:
- [ ] Página carrega rapidamente
- [ ] Sem bloqueadores de renderização crítica

---

### 11. **Integração com Stripe - Webhook**

#### Teste 1: Simulação de Webhook
```bash
# Usar Stripe CLI para testar webhooks localmente
stripe listen --forward-to localhost:3000/stripe-webhook

# Em outro terminal:
stripe trigger payment_intent.succeeded
```

**Esperado**:
- [ ] Webhook recebe evento
- [ ] Badge de crédito criado em `credits` table
- [ ] `valid_until` calculado corretamente (agora + dias)

#### Teste 2: Verificação de Customer
```sql
SELECT * FROM billing_customers WHERE user_id = 'USER_ID';
```

**Esperado**:
- [ ] `stripe_customer_id` preenchido após primeira checkout
- [ ] Pode ser reutilizado em próximas compras

---

## 🔍 Debugging Commands

### Verificar Token JWT
```javascript
const token = localStorage.getItem('sb-[project-id]-auth-token');
if (token) {
  const decoded = JSON.parse(atob(token.split('.')[1]));
  console.log('Token claims:', decoded);
}
```

### Verificar Sessão
```javascript
console.log('Session:', JSON.parse(localStorage.getItem('sb-[project-id]-auth-token')));
```

### Testar Edge Function Localmente
```bash
cd supabase/functions/create-stripe-checkout
deno run --allow-net --allow-env index.ts
```

### Ver Logs do Supabase
```bash
# Terminal
supabase functions list
supabase functions logs create-stripe-checkout
```

---

## 📊 Resultado Esperado Final

**Após todas as validações:**

```
✅ Novo usuário pode se registrar
✅ Role auto-detectado pelo plano
✅ Dados salvos corretamente no BD (raw digits para CNPJ/placa)
✅ /conta exibe todos os dados com ícones profissionais
✅ /plano exibe status corretamente
✅ Checkout funciona sem timeout (15s)
✅ Stripe integration completa
✅ Logout funciona em desktop e mobile
✅ Responsividade OK em todos os tamanhos
✅ Performance aceitável (bundle ~676KB)
```

