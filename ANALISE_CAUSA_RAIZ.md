# 🔴 ANÁLISE DE CAUSA RAIZ - Por Que Não Está Salvando

Baseado no seu relato: "botão salvando eternamente + nada no Supabase + nada no Stripe"

---

## 🎯 Hipóteses em Ordem de Probabilidade

### **HIPÓTESE #1: 🔴 [ALTA PROBABILIDADE]**
**Problema**: RLS (Row-Level Security) está bloqueando INSERT

**Sintomas**:
- ✅ Botão fica "Salvando"
- ✅ Nenhum erro no console
- ✅ Nenhum dado no Supabase
- ✅ Network tab mostra 200 OK (mas erro vem do Postgres)

**Como Verificar**:
1. Abrir Supabase Dashboard
2. Ir para **Authentication** → **Policies**
3. Procurar por `profiles`, `company_profiles`, `driver_profiles`
4. Procurar por regra que diz "INSERT: authenticated users"

**Se a regra existe e está ativada:**
```sql
-- Teste manual
CREATE POLICY "Users can insert own profile" 
  ON profiles 
  FOR INSERT 
  WITH CHECK (auth.uid() = id);
```

**Como Corrigir:**
- ✅ Garantir que a policy permite INSERT para usuários autenticados
- ✅ Garantir que RLS está ATIVADO no Supabase dashboard

---

### **HIPÓTESE #2: 🟠 [MÉDIA PROBABILIDADE]**
**Problema**: AuthContext não está passando user ID corretamente

**Sintomas**:
- ✅ Botão fica "Salvando"
- ✅ Error silencioso (try/catch engole a exceção)
- ✅ `supabaseUser?.id` é `undefined`

**Como Verificar**:
NO CONSOLE, execute:
```javascript
// Ver o contexto completo
const token = localStorage.getItem('sb-[seu-projeto-id]-auth-token');
console.log('Token salvo?', !!token);

if (token) {
  try {
    const [header, payload, sig] = token.split('.');
    const decoded = JSON.parse(atob(payload));
    console.log('Sub (user_id):', decoded.sub);
    console.log('Email:', decoded.email);
  } catch(e) {
    console.log('Token inválido:', e);
  }
}
```

**Se `sub` é undefined:**
- Token corrompido
- Seu Supabase retornou token inválido

**Como Corrigir:**
```tsx
// Em AuthContext.tsx, verificar:
const { data, error } = await supabase.auth.getUser();
if (!data?.user?.id) {
  console.error('Usuário sem ID!', data);
  return null;
}
```

---

### **HIPÓTESE #3: 🟠 [MÉDIA PROBABILIDADE]**
**Problema**: Timeout silencioso na upsert (banco demorando)

**Sintomas**:
- ✅ Botão fica "Salvando" e NUNCA sai desse estado
- ✅ Network requests ficam em "Pending"
- ✅ Nada chega ao Supabase

**Verificar**:
1. Abrir DevTools → Network
2. Procurar por requests para `supabase.co`
3. Ver se há request "stuck" em estado Pending

**Se houver:**
- Supabase pode estar lento/sobrecarregado
- Timeout de 20s pode não ser suficiente

**Como Corrigir:**
- Aumentar timeout para 25s ou 30s
- Adicionar mensagem ao usuário: "Pode levar alguns segundos..."

---

### **HIPÓTESE #4: 🟡 [BAIXA PROBABILIDADE]**
**Problema**: Validação de dados no React está impedindo envio

**Sintomas**:
- ✅ Botão fica "Salvando"
- ✅ Mas antes de enviar para Supabase, trava em validação

**Verificar**:
NO CONSOLE:
```javascript
console.log('Completion busy:', document.querySelector('button[disabled]') ? 'SIM' : 'NÃO');
```

**Se há button disabled:**
- Validação está falhando silenciosamente
- Verificar localStorage por mensagens de erro

---

### **HIPÓTESE #5: 🟡 [BAIXA PROBABILIDADE]**
**Problema**: Supabase anon key está errada ou faltando

**Sintomas**:
- ✅ Qualquer tentativa de upsert falha silenciosamente
- ✅ Não há erro visível (catch engole)

**Verificar**:
NO CONSOLE:
```javascript
fetch('https://[seu-projeto].supabase.co/rest/v1/profiles?select=id.count()', {
  headers: {
    'apikey': '[sua-anon-key-aqui]',
    'Authorization': 'Bearer ' + localStorage.getItem('sb-[seu-projeto]-auth-token')?.split('.')[0]
  }
}).then(r => {
  console.log('Status:', r.status);
  return r.json();
}).then(d => console.log('Response:', d));
```

**Se responder 400 ou 401:**
- API key errada
- Token expirado

---

## 🔧 CORREÇÕES A IMPLEMENTAR AGORA

### **CORREÇÃO #1**: Aumentar timeout ainda mais

Arquivo: `supabase.ts`
```typescript
// Aumentar de 20s para 25s
await withTimeout(supabase.auth.refreshSession(), 25000, "auth_refresh_timeout");
```

### **CORREÇÃO #2**: Adicionar try/catch melhorado

Arquivo: `Login.tsx`
```typescript
try {
  const { error } = await supabase.from("profiles").upsert({...});
  
  // Log ESPECÍFICO de cada tipo de erro
  if (error?.code === 'PGRST116') {
    console.error('RLS Policy bloqueando INSERT');
    throw new Error('Permissão negada - contate suporte');
  }
  if (error?.code === '42P01') {
    console.error('Tabela não existe');
    throw new Error('Tabela não configurada');
  }
  if (error) {
    console.error('Erro Supabase:', error.code, error.message);
    throw error;
  }
} catch (e) {
  console.error('ERRO CRÍTICO:', e);
  throw e;
}
```

### **CORREÇÃO #3**: Adicionar timeout visual ao usuário

```tsx
<Button disabled={completionBusy}>
  {completionBusy ? (
    <>
      <Loader className="animate-spin w-4 h-4 mr-2" />
      Salvando (pode levar até 30s)...
    </>
  ) : (
    'Salvar e Continuar'
  )}
</Button>
```

### **CORREÇÃO #4**: Validar RLS no Supabase

**SQL a executar no Supabase SQL Editor:**

```sql
-- Ativar RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE company_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE driver_profiles ENABLE ROW LEVEL SECURITY;

-- Criar policies de INSERT
CREATE POLICY "Users can insert own profile" 
  ON profiles 
  FOR INSERT 
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can insert own company profile" 
  ON company_profiles 
  FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can insert own driver profile" 
  ON driver_profiles 
  FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

-- Verificar que as policies existem
SELECT tablename, policyname, permissive 
FROM pg_policies 
WHERE tablename IN ('profiles', 'company_profiles', 'driver_profiles');
```

---

## 🧪 TESTE DE VALIDAÇÃO

Depois de aplicar correções, testar em ORDEM:

### **Teste 1**: Conexão com Supabase
```javascript
// NO CONSOLE
fetch('https://[seu-projeto].supabase.co/rest/v1/profiles?limit=1', {
  headers: {
    'apikey': '[sua-anon-key]'
  }
}).then(r => r.text()).then(t => console.log('Supabase:', t));
```
**Esperado**: lista de profiles (pode estar vazia)

### **Teste 2**: RLS Status
```sql
-- NO SUPABASE SQL EDITOR
SELECT tablename, rowsecurity FROM pg_tables 
WHERE tablename IN ('profiles', 'company_profiles', 'driver_profiles');
```
**Esperado**: Todas mostram `rowsecurity = true`

### **Teste 3**: User Insert Permission
```javascript
// NO CONSOLE DO NAVEGADOR (autenticado)
await fetch('https://[seu-projeto].supabase.co/rest/v1/profiles', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer ' + localStorage.getItem('sb-[seu-projeto]-auth-token')
  },
  body: JSON.stringify({
    id: '[seu-user-id]',
    name: 'Test',
    email: '[seu-email]',
    phone: null
  })
}).then(r => r.json()).then(d => console.log('INSERT result:', d));
```
**Esperado**: `{id: "[seu-user-id]", name: "Test", ...}` (sem erro)

---

## 📋 CHECKLIST DE DIAGNÓSTICO

Quando você testar, verifique:

- [ ] Supabase está online (consegue conectar)
- [ ] RLS está ativado nas tabelas
- [ ] Policies de INSERT existem
- [ ] Token JWT é válido e não expirado
- [ ] User ID (sub claim) não é null
- [ ] Network tab mostra requests completando (não pending)
- [ ] Logs do console mostram sucesso ou erro específico
- [ ] Supabase database mostra novo row após insert

---

## 🚨 ÚLTIMO RECURSO

Se nada funcionar:

1. Abrir Supabase SQL Editor
2. Executar:
```sql
-- REMOVER todas as RLS policies (APENAS PARA TESTE)
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;
DROP POLICY IF EXISTS "Users can insert own company profile" ON company_profiles;
DROP POLICY IF EXISTS "Users can insert own driver profile" ON driver_profiles;

-- DESATIVAR RLS (APENAS PARA TESTE - MÁ PRÁTICA!)
ALTER TABLE profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE company_profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE driver_profiles DISABLE ROW LEVEL SECURITY;
```

3. Tentar signup novamente
4. Se funcionar: problema é RLS
5. Se não funcionar: problema é outra coisa

**IMPORTANTE**: Reativar RLS assim que confirmar o diagnóstico!

