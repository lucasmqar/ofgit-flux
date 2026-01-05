# Guia de Troubleshooting - Erros de Autenticação

## Erros Identificados

1. **400 Bad Request** em `/auth/v1/token?grant_type=password`
2. **422 Unprocessable Content** em `/auth/v1/signup`
3. **401 Unauthorized** em `/functions/v1/create-stripe-checkout` (Edge Function não deployada)

## 1. Verificar Configurações do Supabase Auth

### Email Confirmation

Se o email confirmation estiver habilitado, usuários precisam confirmar o email antes de fazer login.

**Verificar:**
1. Acesse: Supabase Dashboard > Authentication > Providers > Email
2. Verifique se "Confirm email" está **DESABILITADO** (para simplificar)
3. OU configure o fluxo de confirmação corretamente

**Se estiver habilitado:**
- Usuários receberão email de confirmação
- Login só funcionará após clicar no link
- O AuthContext.tsx já trata isso: retorna sucesso mas sem session

### Redirect URLs

**Verificar:**
1. Acesse: Supabase Dashboard > Authentication > URL Configuration
2. Adicione estas URLs em "Site URL" e "Redirect URLs":
   - `https://iflux.space`
   - `https://iflux.space/login`
   - `https://www.iflux.space`
   - `https://app.iflux.space`
3. Certifique-se que **todas usam HTTPS**

## 2. Verificar Dados de Signup

### Campos Obrigatórios

O `signUpWithPassword` no AuthContext.tsx requer:

```typescript
{
  email: string,           // Formato válido de email
  password: string,        // Mínimo 6 caracteres
  name: string,
  role: "company" | "driver",
  phone?: string,          // Opcional
  state: string,           // OBRIGATÓRIO e não vazio
  city: string,            // OBRIGATÓRIO e não vazio
  companyName?: string,    // Obrigatório se role = "company"
  vehicleType?: string,    // Obrigatório se role = "driver"
  vehicleModel?: string,   // Obrigatório se role = "driver"
  plate?: string           // Obrigatório se role = "driver"
}
```

### Validação no Login.tsx

A validação atual verifica:
- Senha >= 6 caracteres
- Cidade selecionada (não vazia)
- Estado = "GO" (fixo)

**Possível problema:** Se state/city estiverem vazios, o signup falhará com 422.

## 3. Logs do Supabase

### Ver Logs de Autenticação

1. Acesse: Supabase Dashboard > Logs > Auth Logs
2. Filtre por timestamp do erro
3. Procure por mensagens de erro detalhadas

### Logs Comuns

**422 Unprocessable:**
- Email já existe
- Formato de email inválido
- Senha muito curta
- Campos obrigatórios vazios

**400 Bad Request:**
- Redirect URL não permitida
- Grant type inválido
- Parâmetros missing

## 4. Testar Autenticação Manualmente

### Teste 1: Signup via Supabase SDK

```javascript
// No console do navegador (em https://iflux.space)
const { data, error } = await window.supabase.auth.signUp({
  email: 'teste@exemplo.com',
  password: '123456',
  options: {
    data: {
      name: 'Teste User',
      phone: null,
      role: 'company'
    }
  }
})

console.log('Signup result:', data, error)
```

### Teste 2: Login via Supabase SDK

```javascript
const { data, error } = await window.supabase.auth.signInWithPassword({
  email: 'teste@exemplo.com',
  password: '123456'
})

console.log('Login result:', data, error)
```

## 5. Verificar Network Tab

No DevTools do navegador:

1. Abra Network tab
2. Tente fazer signup/login
3. Clique na requisição que falhou (400/422)
4. Veja "Payload" para confirmar dados enviados
5. Veja "Response" para ver mensagem de erro detalhada

### Exemplo de Response 422

```json
{
  "error": "User already registered",
  "message": "User already registered"
}
```

## 6. Verificar Policies do Supabase

### Profiles Table

Verifique se há policies que permitem INSERT:

```sql
-- No SQL Editor do Supabase
SELECT * FROM pg_policies 
WHERE tablename = 'profiles';
```

A policy deve permitir que usuários autenticados criem seu próprio perfil.

### Company/Driver Profiles

```sql
SELECT * FROM pg_policies 
WHERE tablename IN ('company_profiles', 'driver_profiles');
```

## 7. Fix Conhecido: Email Confirmation

Se você quer desabilitar confirmação de email:

1. Dashboard > Authentication > Providers > Email
2. **DESMARQUE** "Confirm email"
3. Clique em "Save"

Se quiser manter habilitado, ajuste o fluxo:
- Mostre mensagem: "Verifique seu email para confirmar cadastro"
- Implemente tela de "Email não confirmado"
- Configure template de email no Dashboard

## 8. Checklist de Verificação

- [ ] Redirect URLs incluem https://iflux.space/login
- [ ] Email confirmation está configurado corretamente
- [ ] Policies permitem INSERT em profiles/company_profiles/driver_profiles
- [ ] Edge Functions foram deployadas (ver DEPLOY_EDGE_FUNCTIONS.md)
- [ ] Variáveis de ambiente do Supabase estão corretas
- [ ] Password >= 6 caracteres
- [ ] State e City não estão vazios

## Solução Rápida

Se os erros persistirem, tente criar um usuário manualmente via Supabase Dashboard:

1. Dashboard > Authentication > Users > Add user
2. Email: teste@exemplo.com
3. Password: 123456
4. Auto Confirm User: **YES**
5. Depois teste login no site institucional

---

**Próximos Passos:**
1. ✅ Selects de cidade implementados (state=GO fixo, city=Rio Verde|Bom Jesus)
2. ✅ Responsividade desktop corrigida (md:flex-row)
3. ⏳ Deploy das Edge Functions (ver DEPLOY_EDGE_FUNCTIONS.md)
4. ⏳ Investigar erros 400/422 (seguir este guia)
