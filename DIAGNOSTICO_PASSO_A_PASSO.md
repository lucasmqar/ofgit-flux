# 🔍 GUIA DE DIAGNÓSTICO PASSO A PASSO - FLUX Checkout

## Objetivo
Validar cada etapa do fluxo de checkout e identificar exatamente onde está o problema.

---

## ✅ ETAPA 1: Preparação
**O que fazer:**
1. Abrir DevTools do navegador (F12)
2. Ir para aba "Console"
3. Colar este comando para limpar dados antigos:
```javascript
sessionStorage.clear();
localStorage.removeItem('sb-[seu-project-id]-auth-token');
location.reload();
```

**Esperado:**
- Página recarrega
- Console limpo (sem erros vermelhos)

---

## ✅ ETAPA 2: Testar Auto-detecção de Role
**O que fazer:**
1. Ir para https://iflux.space
2. Clicar em um plano, ex: "Plano Empresa - 15 dias"
3. Aguardar redirecionamento para /login
4. NO CONSOLE, colar:
```javascript
console.log("Pending Plan:", sessionStorage.getItem("pendingCheckoutPlanKey"));
```

**Esperado - NO CONSOLE:**
```
✅ Pending Plan: company_15d
```

**Se vir algo diferente:**
- ❌ Nada apareceu = plano não foi salvo no sessionStorage
- ❌ "null" = sessionStorage foi limpo durante redirecionamento

**Como correrigir:**
- Não feche as abas entre Home e Login
- Abra DevTools ANTES de clicar no plano

---

## ✅ ETAPA 3: Verificar Auto-Seleção de Role
**O que fazer:**
1. Continuar na tela "Escolha o tipo da sua conta"
2. Verificar se "Empresa" está PRÉ-SELECIONADO
3. NO CONSOLE, colar:
```javascript
console.log("URL atual:", window.location.href);
```

**Esperado:**
- Role pré-selecionado e marcado ✓
- Info box azul mostrando "Baseado no plano "company_15d""
- URL: `https://iflux.space/login`

**Se não estiver pré-selecionado:**
- Clique manualmente em "Empresa"
- Você verá border azul ao redor e descrição aparecer

---

## ✅ ETAPA 4: Testar Google OAuth
**O que fazer:**
1. Clicar em "Continuar com Google"
2. Fazer login com conta Google
3. NO CONSOLE, monitore:
```javascript
// Auto-executa a cada 2 segundos
setInterval(() => {
  const logs = console.getLogs ? console.getLogs() : [];
  console.log("[AUTO-MONITOR] Últimos logs:", logs.slice(-5));
}, 2000);
```

**Esperado:**
- Você é redirecionado
- Se É novo usuário → tela "Escolha tipo de conta"
- Se role JÁ existe → vai direto para "Complete seu perfil"
- NO CONSOLE aparecem logs começando com `[handleCompleteProfile]`

**Logs esperados (procure por estes):**
```
[handleCompleteProfile] INICIANDO perfil save...
[handleCompleteProfile] userID: [uuid-aqui]
[handleCompleteProfile] role: company
[handleCompleteProfile] name: [seu nome]
[handleCompleteProfile] Salvando company_profiles...
[handleCompleteProfile] ✅ Base profile salvo
[handleCompleteProfile] ✅ Company profile salvo
```

---

## ✅ ETAPA 5: Diagnosticar Error de Save
**SE o botão "Salvar e Continuar" ficar travado:**

**NO CONSOLE, execute:**
```javascript
// Procure por qualquer um desses padrões:
// 1. Error de permission
// 2. Error de validation
// 3. Error de connection

// Copie aqui TODA a linha vermelha de erro
```

**Paste a mensagem de erro aqui, procurando por:**
- ❌ `"relation "company_profiles" does not exist"` → Tabela não existe
- ❌ `"permission denied"` → Row-level security (RLS) bloqueando
- ❌ `"connection timeout"` → Supabase offline
- ❌ `"invalid field"` → Campo no código não existe na tabela

**Como enviar para análise:**
Copie a LINHA VERMELHA INTEIRA e compartilhe comigo.

---

## ✅ ETAPA 6: Monitorar Supabase em Tempo Real
**Enquanto testa o save:**

1. Abrir Supabase Dashboard → seu projeto
2. Ir para "SQL Editor"
3. Colar e executar:
```sql
-- Verificar se profile foi criado
SELECT id, name, email, phone FROM profiles 
WHERE id = '[seu-user-id-aqui]' 
LIMIT 1;

-- Verificar se company_profiles foi criado
SELECT * FROM company_profiles 
WHERE user_id = '[seu-user-id-aqui]' 
LIMIT 1;
```

**Esperado:**
- 1ª query retorna 1 row com name, email
- 2ª query retorna 1 row com company_name, cnpj, etc

**Se não retornar nada:**
- Dados NÃO foram salvos
- Error provavelmente está no console

---

## ✅ ETAPA 7: Verificar Validação de Checkout
**Se chegou até aqui:**

1. NO CONSOLE, execute:
```javascript
// Simular chamada de checkout
const planKey = sessionStorage.getItem("pendingCheckoutPlanKey");
console.log("Tentando checkout com:", planKey);
```

2. Aguarde logs começarem com `[createStripeCheckout]`

**Logs esperados:**
```
[createStripeCheckout] Refreshing session (timeout 20s)...
[createStripeCheckout] Session refreshed OK
[createStripeCheckout] Token obtido: SIM (eyJhbGciOi...)
[createStripeCheckout] Primeira tentativa...
[createStripeCheckout] Resposta status: 200
[createStripeCheckout] Payload: {success: true, url: "https://checkout.stripe.com/..."}
```

**Se vir `auth_refresh_timeout`:**
- Aumentaremos timeout ainda mais (20s → 25s)
- Pode ser problema de conexão do seu Supabase

**Se vir `401 Unauthorized`:**
- Token inválido ou expirado
- Tentar fazer logout e novo login

---

## ✅ ETAPA 8: Simular Erro de Perfil Incompleto
**Para FORÇAR erro de validação:**

NO CONSOLE:
```javascript
// Deletar phone para forçar erro
localStorage.removeItem('sb-[seu-project-id]-auth-token');
location.reload();
```

1. Fazer login novamente
2. NO CAMPO TELEFONE, deixar vazio
3. Clicar "Salvar e Continuar"

**Esperado:**
- Toast de erro ANTES de enviar
- Button continua com estado normal (não travado)

**Se travou:**
- Error handling pode estar quebrado
- Precisamos ajustar try/catch

---

## 📊 CHECKLIST DE DIAGNÓSTICO

Use este checklist para rastrear onde você está:

- [ ] **ETAPA 1**: Console limpo, sem erros iniciais
- [ ] **ETAPA 2**: sessionStorage contém "company_15d" ou "driver_30d"
- [ ] **ETAPA 3**: Role está pré-selecionado
- [ ] **ETAPA 4**: Google OAuth funciona, vê logs `[handleCompleteProfile]`
- [ ] **ETAPA 5**: Console NÃO mostra erro vermelho ao clicar Save
- [ ] **ETAPA 6**: Supabase mostra nova row em `profiles` e `company_profiles`
- [ ] **ETAPA 7**: Logs mostram `[createStripeCheckout]` com status 200
- [ ] **ETAPA 8**: Erros de validação funcionam corretamente (sem travamento)

---

## 🎯 Se ALGO FALHAR

**Copie estas informações e compartilhe COMIGO:**

```
=== DIAGNÓSTICO DE ERRO ===
Data/Hora: [preencha]
Navegador: Chrome/Firefox/Safari [qual?]
Étapa que falhou: [qual?]

ERRO DO CONSOLE:
[Cole aqui a linha vermelha INTEIRA]

LOGS DO CONSOLE:
[Cole aqui 10 últimas linhas dos logs]

PASSOS PARA REPRODUZIR:
1. [Passo 1]
2. [Passo 2]
3. ...

SCREENSHOT:
[Attach imagem da tela mostrando erro]
```

---

## 🔧 COMANDOS ÚTEIS (CONSOLE)

### Ver todos os logs filtrados
```javascript
// Copie tudo que começa com [handleCompleteProfile] ou [createStripeCheckout]
const logs = [];
console.log("=== FILTRANDO LOGS ===");
// (você vai precisar rolar o console e copiar)
```

### Verificar token JWT
```javascript
const token = localStorage.getItem('sb-[seu-project-id]-auth-token');
if (token) {
  const decoded = JSON.parse(atob(token.split('.')[1]));
  console.log('Token Claims:', decoded);
  console.log('Expira em:', new Date(decoded.exp * 1000));
} else {
  console.log('Sem token - não autenticado');
}
```

### Teste de conexão com Supabase
```javascript
// Este teste verifica se seu Supabase está respondendo
fetch('https://[seu-projeto].supabase.co/rest/v1/profiles?select=id.count()', {
  headers: {
    'apikey': '[sua-anon-key]'
  }
}).then(r => r.json()).then(d => console.log('Supabase OK:', d));
```

### Limpar tudo e recomeçar
```javascript
sessionStorage.clear();
localStorage.clear();
location.reload();
```

---

## ✅ Próximas Ações (depois do diagnóstico)

Assim que você tiver os logs/erros, vou:

1. **Identificar o gargalo específico** (save, auth, stripe, etc)
2. **Implementar fix preciso** para aquele ponto
3. **Fazer novo deploy**
4. **Testar novamente com você**

Não é para adivinhar - é para SABER exatamente onde está o problema!

