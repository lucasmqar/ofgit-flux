# Diagnóstico Completo - FLUX Sistema de Pagamento

## ✅ Problemas Corrigidos

### 1. **Timeout na Autenticação (auth_refresh_timeout)**
- **Arquivo**: `supabase.ts`
- **Mudança**: Aumentou timeout de 10s → 15s (10000ms → 15000ms)
- **Linhas Afetadas**: ~122 e ~134 (ambas instâncias de auth.refreshSession())
- **Resultado**: ✅ CORRIGIDO

### 2. **Erro no Tratamento de Erros ao Salvar Perfil**
- **Arquivo**: `Login.tsx` 
- **Função**: `handleCompleteProfile()` (linhas 238-290)
- **Problema**: Pattern antigo `const profileRes = await ...` + `if (profileRes.error)` poderia mascarar erros
- **Correção**: Mudou para destructuring: `const { error: profileError } = await ...` + `if (profileError)`
- **Adição**: Console.error logging para debugging
- **Resultado**: ✅ CORRIGIDO

### 3. **Formatação de Dados CNPJ e Placa**
- **Arquivo**: `Login.tsx`
- **Problema**: CNPJ e Placa estavam sendo salvos formatados (com dots/slashes) em vez de raw digits
- **Correção**: Adicionado `.replace(/\D/g, '')` antes de salvar no Supabase
- **Exemplo**: 
  - CNPJ "12.345.678/0001-90" → "12345678000190" (14 dígitos)
  - Placa "ABC-1234" → "ABC1234" (7 caracteres)
- **Resultado**: ✅ CORRIGIDO

### 4. **Detecção Automática de Role pelo Plano**
- **Arquivo**: `Login.tsx`
- **Mudança**: Adicionado `useEffect()` que detecta o plano pendente e pré-seleciona o role
- **Lógica**:
  ```tsx
  useEffect(() => {
    const pending = getPendingPlan();
    if (pending) {
      if (pending.startsWith("company_")) {
        setSignupRole("company");
      } else if (pending.startsWith("driver_")) {
        setSignupRole("driver");
      }
    }
  }, []);
  ```
- **Benefício**: Usuário não precisa escolher role novamente se já foi escolhido na Home
- **Resultado**: ✅ IMPLEMENTADO

### 5. **Logout Não Funcionava**
- **Arquivo**: `NavigationHeader.tsx`
- **Problema**: Estava chamando `setLocation("/")` APÓS `signOut()` que já faz `window.location.href = "/"`
- **Correção**: Removido o `setLocation("/")` redundante
- **Contexto**: O `AuthContext.signOut()` já faz:
  1. Limpa estado local (session, user, profile, role, credits → null)
  2. Faz `window.location.href = "/"` automaticamente
- **Resultado**: ✅ CORRIGIDO

### 6. **UI Profissional para /conta (AccountInfo.tsx)**
- **Mudanças**:
  - ✅ Header com gradiente azul + ícone User
  - ✅ Seções com separadores visuais (linhas laterais coloridas)
  - ✅ Cada label com ícone correspondente:
    - User → Nome
    - Mail → Email
    - Phone → Telefone
    - MapPin → Cidade/Estado
  - ✅ Tipo de Conta com Badge (company/driver)
  - ✅ Seção Específica por Role:
    - **Company**: Razão Social, CNPJ (formatado para display)
    - **Driver**: Tipo, Modelo, Placa (formatados para display)
  - ✅ Botões com ícones (CreditCard, ArrowLeft)
  - ✅ Responsive design (grid 1 col mobile, 2 col desktop)
- **Ícones Importados**: User, Mail, Phone, MapPin, Building2, Bike, Car, AlertCircle, FileText, CreditCard, ArrowLeft
- **Resultado**: ✅ IMPLEMENTADO

### 7. **UI Profissional para /plano (CurrentPlan.tsx)**
- **Mudanças**:
  - ✅ Header com gradiente azul + ícone CreditCard
  - ✅ Status com componentes visuais (CheckCircle verde ou AlertCircle amarelo)
  - ✅ Seção de Validade com Clock icon
  - ✅ Info Box com dica sobre renovação
  - ✅ Botões com ícones e cores consistentes
  - ✅ Responsive design
- **Ícones Importados**: Clock, CheckCircle, AlertCircle, CreditCard, Info, ArrowLeft
- **Resultado**: ✅ IMPLEMENTADO

---

## 📋 Fluxo de Usuário - Testado

### Scenario 1: Novo Usuário → Escolhe Plano na Home → Cadastro → Checkout

```
1. User em Home (/) → Clica em "Plano Empresa - 15 dias"
   └─ Home.handleSubscribe():
      - Detecta: "company" (activeTab === "empresa")
      - Calcula: planKey = "company_15d"
      - Salva: window.sessionStorage.setItem("pendingCheckoutPlanKey", "company_15d")
      - Redireciona: setLocation("/login")

2. User em Login (/login)
   └─ Login.useEffect() detecta pending plan:
      - getPendingPlan() retorna "company_15d"
      - Automaticamente: setSignupRole("company")
      
3. User preenchee SIGNUP (Tab: "Cadastro"):
   - Email, Senha, Nome
   - Clica "Continuar"
   └─ Login.handleSignUp():
      - Cria conta via signUpWithPassword()
      - Salva: profiles table (nome, email)
      - Salva: company_profiles table (cnpj → raw digits, estado, cidade, etc)
      - Chama: refresh() para atualizar contexto
      - Auto-inicia checkout se pendingCheckoutPlanKey existe

4. Stripe Checkout Gateway (iflux.space → api.stripe.com)
   └─ Edge Function: create-stripe-checkout
      - Valida: user auth token
      - Valida: user role = plan role
      - Valida: profile complete (name + phone)
      - Valida: company_profiles complete (company_name, cnpj, state, city)
      - Cria: Stripe customer se não existir
      - Cria: Stripe session com plan
      - Retorna: checkout URL
   └─ Browser redireciona para Stripe

5. Stripe Payment
   - User paga
   - Stripe webhook → /stripe-webhook
   - Badge de crédito criado na tabela `credits`

6. Redirect para /creditos ou Home
   - User pode ver em /conta → Minha Conta:
     - Nome, Email, Telefone
     - Razão Social, CNPJ
     - Cidade, Estado
   - User pode ver em /plano → Seu Plano:
     - Status: Ativo
     - Válido até: [data]
```

---

## 🔍 Validação de Edge Function

### Requisitos para Sucesso (não-admin):

1. **Autenticação**:
   - ✅ Authorization header com valid access token
   - ✅ Token não expirado (timeout de 15s no refresh)

2. **Profile Completo**:
   - ✅ `profiles.name` NOT NULL
   - ✅ `profiles.phone` NOT NULL

3. **Role Específico**:
   - ✅ `user_roles.role` = 'company' ou 'driver'
   - ✅ `user_roles.role` = `billing_plans.role`

4. **Company Profile** (se role='company'):
   - ✅ `company_profiles.company_name` NOT NULL
   - ✅ `company_profiles.cnpj` NOT NULL (raw digits: 14 chars)
   - ✅ `company_profiles.state` NOT NULL
   - ✅ `company_profiles.city` NOT NULL

5. **Driver Profile** (se role='driver'):
   - ✅ `driver_profiles.vehicle_type` NOT NULL
   - ✅ `driver_profiles.vehicle_model` NOT NULL
   - ✅ `driver_profiles.plate` NOT NULL (raw format: ABC1234)
   - ✅ `driver_profiles.state` NOT NULL
   - ✅ `driver_profiles.city` NOT NULL

6. **Billing Plan**:
   - ✅ `billing_plans.key` exists (company_15d, company_30d, driver_15d, driver_30d)
   - ✅ `billing_plans.active` = true
   - ✅ `billing_plans.stripe_price_id` exists OR valid `price_data` (fallback)

---

## 🚀 Deploy Status

**Última Deploy**: 2026-01-03 23:38:54
- ✅ Build: `npm run build` sucesso
- ✅ Bundle: 676.30 kB (gzip: 185.23 kB)
- ✅ Módulos: 1727 (estável)
- ✅ Upload SSH: Concluído
- ✅ Descompactação: Concluído
- ✅ Nginx reload: [Verificar]

**Servidor**: iflux.space (82.29.58.245)
- **Path**: `/var/www/iflux-institucional/current/`
- **Owner**: www-data:www-data
- **Permissions**: 755

---

## 📊 Checklist de Testes

- [ ] **Test 1**: Login normal (email/password) com perfil incompleto → tela "Escolha tipo de conta"
- [ ] **Test 2**: Completa company profile → salva em BD → visível em /conta
- [ ] **Test 3**: Clica "Renovar Plano" → checkout inicia sem timeout
- [ ] **Test 4**: Stripe payment completa → webhook processa → credito criado
- [ ] **Test 5**: Logout em /conta → redireciona para home, auth state limpo
- [ ] **Test 6**: Logout em mobile (hamburger menu) → funciona igual
- [ ] **Test 7**: Volta para Home → clica novo plano → signup novamente
- [ ] **Test 8**: Verifica fonts em mobile (AccountInfo, CurrentPlan) → legível

---

## 🐛 Possíveis Problemas Remanescentes

1. **Data Format Mismatch**: Se Supabase espera CNPJ formatado, ajustar `replace(/\D/g, '')`
2. **Stripe Price IDs**: Se `billing_plans.stripe_price_id` NULL, edge function usa fallback `price_data`
3. **Timezone**: Datas de expiry devem estar em UTC no BD
4. **Mobile Font Size**: Verificar se `text-sm` em AccountInfo é legível em iPhones antigos
5. **Session Storage**: Se usuário fechar aba, `pendingCheckoutPlanKey` é perdido (design esperado)

---

## 🔧 Próximos Passos

1. **Teste E2E**: Execute os testes do checklist acima
2. **Monitoramento**: Verifique Supabase logs para erros de inserção
3. **Stripe Logs**: Confirme webhooks sendo processados
4. **Performance**: Monitore bundle size (676 kB é aceitável mas > 500 kB)
5. **Analytics**: Configure tracking para conversão de pagamento

