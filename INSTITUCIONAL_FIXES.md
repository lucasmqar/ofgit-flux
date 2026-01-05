# Correções Institucional - Autenticação e UX

## Problemas Identificados e Soluções

### 1. Erros de Autenticação (400/422/401)

**Problema**: 
- `POST /auth/v1/token 400`: Email ou senha inválidos
- `POST /auth/v1/signup 422`: Email já cadastrado ou validação falhou
- `POST /functions/v1/create-stripe-checkout 401`: Token inválido ou expirado

**Causas**:
1. Email confirmation habilitado no Supabase → usuário tenta fazer checkout antes de confirmar email
2. Redirect URLs não whitelistadas
3. Token não está sendo refresh corretamente

**Soluções Implementadas**:

#### A. Melhorar Mensagens de Erro no Login.tsx

```typescript
// No handleLogin, trocar:
toast.error(err instanceof Error ? err.message : "Erro no login");

// Por:
const errorMsg = err instanceof Error ? err.message : "Erro no login";
if (errorMsg.includes("Invalid login credentials") || errorMsg.includes("Invalid")) {
  toast.error("Email ou senha inválidos. Verifique seus dados.");
} else if (errorMsg.includes("Email not confirmed")) {
  toast.error("Confirme seu email antes de fazer login. Verifique sua caixa de entrada.");
} else {
  toast.error(errorMsg);
}
```

#### B. Melhorar Mensagens de Erro no Signup

```typescript
// No handleSignupStep3, trocar:
toast.error(err instanceof Error ? err.message : "Erro no cadastro");

// Por:
const errorMsg = err instanceof Error ? err.message : "Erro no cadastro";
if (errorMsg.includes("User already registered") || errorMsg.includes("already")) {
  toast.error("Este email já está cadastrado. Faça login ou use outro email.");
} else if (errorMsg.includes("Password") || errorMsg.includes("senha")) {
  toast.error("A senha deve ter pelo menos 6 caracteres.");
} else if (errorMsg.includes("Email")) {
  toast.error("Email inválido. Verifique o formato.");
} else if (errorMsg.includes("confirm") || errorMsg.includes("verificação")) {
  toast.info("Cadastro criado! Verifique seu email para confirmar a conta.");
} else {
  toast.error(errorMsg);
}
```

#### C. Validação de Cidade Obrigatória

No arquivo `institucional/flux-institucional/client/src/pages/Login.tsx`, adicionar validação:

```typescript
const handleSignupStep3 = async () => {
  if (!signupRole) {
    toast.error("Selecione um tipo de conta.");
    return;
  }
  if (!signupCity) {  // ADICIONAR ESTA VALIDAÇÃO
    toast.error("Selecione sua cidade.");
    return;
  }
  // resto do código...
}
```

### 2. Responsividade Desktop - Botões Empilhados

**Problema**: Botões ficam empilhados em desktop porque `sm:flex-row` ativa apenas em 640px+

**Solução**: Trocar `sm:flex-row` por `md:flex-row` (768px+) para desktop adequado

#### Arquivo: `institucional/flux-institucional/client/src/pages/AccountInfo.tsx`

Linha ~143:
```tsx
// TROCAR:
<div className="pt-2 flex flex-col sm:flex-row gap-2">

// POR:
<div className="pt-2 flex flex-col md:flex-row gap-2">
```

#### Arquivo: `institucional/flux-institucional/client/src/pages/CurrentPlan.tsx`

Linha ~72:
```tsx
// TROCAR:
<div className="pt-2 flex flex-col sm:flex-row gap-2">

// POR:
<div className="pt-2 flex flex-col md:flex-row gap-2">
```

### 3. Seleção de Cidade/Estado (Padrão do App)

**Situação Atual**: Login.tsx já tem Select com as mesmas cidades do app (Rio Verde e Bom Jesus de Goiás)

**Verificar**: O código já está correto nas linhas 345-356 do Login.tsx:

```tsx
<Select value={signupCity} onValueChange={setSignupCity} required>
  <SelectTrigger>
    <SelectValue placeholder="Selecione a cidade" />
  </SelectTrigger>
  <SelectContent>
    <SelectItem value="Rio Verde">Rio Verde</SelectItem>
    <SelectItem value="Bom Jesus de Goiás">Bom Jesus de Goiás</SelectItem>
  </SelectContent>
</Select>
```

✅ **JÁ IMPLEMENTADO CORRETAMENTE**

### 4. Edge Functions - Deploy Necessário

**IMPORTANTE**: As Edge Functions foram reescritas para usar HTTP puro (sem Stripe SDK) para evitar o erro `runMicrotasks()`.

**Ação Necessária**: Deploy das Edge Functions via Supabase CLI

```powershell
cd "c:\Users\lucas\OneDrive\Desktop\FLUX - CODE\ARQUIVO BASE - FLUX V3\01 - DEPLOY\iflux-main"

# Baixar e instalar Supabase CLI (já feito anteriormente)
.\supabase.exe login

# Link ao projeto
.\supabase.exe link --project-ref oxszjnxqwomlbotooqbh

# Deploy das functions
.\supabase.exe functions deploy create-stripe-checkout
.\supabase.exe functions deploy stripe-webhook
```

### 5. Configuração Supabase Auth

Verificar no Supabase Dashboard → Authentication → URL Configuration:

#### Redirect URLs (deve incluir):
```
https://iflux.space
https://iflux.space/login
https://iflux.space/?login=success
https://www.iflux.space
https://www.iflux.space/login
https://www.iflux.space/?login=success
```

#### Site URL:
```
https://iflux.space
```

#### Email Confirmation

Supabase Dashboard → Authentication → Settings → Email Auth:

- **Opção 1 (Recomendado para testes)**: Desabilitar "Enable email confirmations"
  - Permite login imediato após signup
  - Melhor UX para checkout rápido

- **Opção 2 (Produção)**: Manter habilitado
  - Usuário deve confirmar email antes de fazer checkout
  - Ajustar mensagens de erro para orientar o usuário

### 6. Verificação de Acesso às Páginas de Apoio

**Status**: ✅ **JÁ FUNCIONA**

O menu em `Home.tsx` já está configurado para:
- Usuário autenticado: mostra "Minha Conta" (`/conta`) e "Plano" (`/plano`)
- As páginas `AccountInfo.tsx` e `CurrentPlan.tsx` já verificam autenticação
- Redirecionam para `/login` se não autenticado

## Checklist de Implementação

- [ ] 1. Aplicar melhorias nas mensagens de erro (Login.tsx)
- [ ] 2. Adicionar validação de cidade obrigatória (Login.tsx)
- [ ] 3. Trocar `sm:flex-row` por `md:flex-row` (AccountInfo.tsx e CurrentPlan.tsx)
- [ ] 4. Deploy das Edge Functions via Supabase CLI
- [ ] 5. Verificar Redirect URLs no Supabase Dashboard
- [ ] 6. Ajustar Email Confirmation (recomendar desabilitar para testes)
- [ ] 7. Rebuild e redeploy do site institucional
- [ ] 8. Testar fluxo completo: Assinar → Login/Signup → Checkout

## Como Aplicar as Mudanças

### Opção A: Editar Manualmente

1. Abrir os arquivos mencionados
2. Aplicar as mudanças conforme documentado acima
3. Rebuild do site (via script deploy)

### Opção B: Via Deploy Script (recomendado)

```powershell
cd "c:\Users\lucas\OneDrive\Desktop\FLUX - CODE\ARQUIVO BASE - FLUX V3\01 - DEPLOY\iflux-main"

# Rebuild + Deploy automatizado
powershell -NoProfile -ExecutionPolicy Bypass -File ".\scripts\deploy_institutional_and_verify.ps1" -SshHost "root@82.29.58.245" -SkipNginx
```

## Próximos Passos

1. **Aplicar as correções de código** (mensagens de erro + responsividade)
2. **Deploy das Edge Functions** (resolver 401 no checkout)
3. **Configurar Supabase Auth** (redirect URLs + email confirmation)
4. **Redeploy do site** institucional
5. **Teste end-to-end**: Assinar → Signup → Checkout → Sucesso
