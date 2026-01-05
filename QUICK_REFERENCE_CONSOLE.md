# 🎯 QUICK REFERENCE - Comandos do Console

Copie e cole EXATAMENTE para coletar diagnóstico.

---

## 1️⃣ ANTES DE COMEÇAR

```javascript
// Limpar tudo
sessionStorage.clear();
localStorage.clear();
console.clear();
location.reload();
```

**Resultado esperado**: Página recarrega limpa

---

## 2️⃣ APÓS CLICAR NO PLANO

```javascript
// Verificar se plano foi salvo
console.log("Pending Plan:", sessionStorage.getItem("pendingCheckoutPlanKey"));
console.log("URL:", window.location.href);
```

**Esperado**:
```
Pending Plan: company_15d (ou driver_30d, etc)
URL: https://iflux.space/login
```

---

## 3️⃣ PARA VER SE ROLE FOI PRÉ-SELECIONADO

```javascript
// Procurar elemento do radio button
const company = document.getElementById('role-company');
const driver = document.getElementById('role-driver');
console.log("Company checked?", company?.checked);
console.log("Driver checked?", driver?.checked);
```

**Esperado**:
```
Company checked? true  (ou true se clicou em driver)
Driver checked? false  (ou false se clicou em driver)
```

---

## 4️⃣ QUANDO COMEÇAR O SAVE

```javascript
// Monitorar button status
setInterval(() => {
  const btn = document.querySelector('button[type="button"]');
  console.log(new Date().toLocaleTimeString(), 
    "Button disabled?", btn?.disabled,
    "Button text:", btn?.textContent?.slice(0, 30));
}, 2000);
```

**Resultado**: Mostra a cada 2 segundos se button está disabled

---

## 5️⃣ EXTRAIR LOGS IMPORTANTES

```javascript
// Copiar TODOS os logs que começam com [handleCompleteProfile]
// Fazer isso DURANTE o clique de save

// Depois de alguns segundos, execute:
console.log("=== TODOS OS LOGS IMPORTANTES ===");
// (você vai precisar rolar e copiar manualmente)
```

**O que procurar**:
- Linhas com ✅ (sucesso)
- Linhas com ❌ (erro)
- Qualquer coisa em vermelho

---

## 6️⃣ SE FICAR TRAVADO

```javascript
// Verificar se há requisição pendente
fetch('https://iflux.space/api/check', {timeout: 2000})
  .then(() => console.log("Servidor respondendo"))
  .catch(() => console.log("Servidor lento ou offline"));

// Força parar o loading
console.log("Tentando parar loading manualmente...");
// (pode ser necessário recarregar)
```

---

## 7️⃣ TESTE DE SUPABASE

```javascript
// Verificar conexão com Supabase
const project = '[seu-projeto]'; // Substitua
const url = `https://${project}.supabase.co/rest/v1/profiles?limit=1`;
const key = '[sua-anon-key]'; // Substitua

fetch(url, {
  headers: { 'apikey': key }
})
.then(r => r.json())
.then(d => console.log("Supabase respondeu:", d))
.catch(e => console.log("Erro Supabase:", e.message));
```

**Esperado**:
```
Supabase respondeu: Array (vazio ou com dados)
```

---

## 8️⃣ VERIFICAR TOKEN

```javascript
// Ver token JWT completo
const token = localStorage.getItem('sb-[seu-projeto]-auth-token');
if (token) {
  const [h, p, s] = token.split('.');
  const decoded = JSON.parse(atob(p));
  console.table(decoded);
} else {
  console.log("Sem token - não autenticado");
}
```

**Esperado**:
```
sub: "seu-user-id-uuid"
email: "seu-email@..."
exp: 1704123456
iat: 1704119856
```

---

## 9️⃣ MONITORAR EM TEMPO REAL

```javascript
// Execute ANTES de clicar "Salvar"
// Isso vai capturar todos os logs

let logs = [];
const originalLog = console.log;
const originalError = console.error;

console.log = function(...args) {
  logs.push({type: 'log', msg: args.join(' '), time: new Date().toLocaleTimeString()});
  originalLog.apply(console, args);
};

console.error = function(...args) {
  logs.push({type: 'error', msg: args.join(' '), time: new Date().toLocaleTimeString()});
  originalError.apply(console, args);
};

// Depois, para ver os logs:
console.table(logs);

// Para copiar como texto:
console.log(logs.map(l => `[${l.time}] ${l.type.toUpperCase()}: ${l.msg}`).join('\n'));
```

---

## 🔟 TESTE FINAL DE DIAGNÓSTICO

```javascript
// Executar TUDO junto após o erro

console.log("=== DIAGNÓSTICO COMPLETO ===\n");

// 1. Status do token
const token = localStorage.getItem('sb-[seu-projeto]-auth-token');
console.log("Token existe?", !!token);
if (token) {
  try {
    const decoded = JSON.parse(atob(token.split('.')[1]));
    console.log("User ID:", decoded.sub);
  } catch (e) {
    console.log("Token inválido:", e.message);
  }
}

// 2. Status do plano
console.log("Pending Plan:", sessionStorage.getItem("pendingCheckoutPlanKey"));

// 3. URL atual
console.log("URL:", window.location.href);

// 4. Storage
console.log("LocalStorage items:", Object.keys(localStorage).length);
console.log("SessionStorage items:", Object.keys(sessionStorage).length);

console.log("\n=== COPIE TUDO ACIMA E COMPARTILHE COMIGO ===");
```

---

## ⚠️ ERROS COMUNS QUE VOCÊ PODE VER

### Erro 1: RLS Policy bloqueando
```
Error: new row violates row-level security policy for table "profiles"
```
**Significa**: Supabase está bloqueando INSERT
**Solução**: Verificar RLS policies

### Erro 2: Tabela não existe
```
Error: relation "company_profiles" does not exist
```
**Significa**: Banco de dados não foi migrado
**Solução**: Executar migrations no Supabase

### Erro 3: Permissão negada
```
Error: permission denied for table profiles
```
**Significa**: Usuário não tem acesso
**Solução**: Verificar RLS ou permissões de role

### Erro 4: Timeout
```
Error: auth_refresh_timeout
```
**Significa**: Supabase demorando mais de 20s
**Solução**: Aumentar para 25s-30s, ou verificar conexão

### Erro 5: Token inválido
```
Error: invalid token
```
**Significa**: JWT não é válido
**Solução**: Logout + login novamente

---

## 🎬 FLUXO RÁPIDO

**1. Limpar**
```javascript
sessionStorage.clear(); location.reload();
```

**2. Escolher plano**
- Clicar em um plano

**3. Verificar**
```javascript
console.log(sessionStorage.getItem("pendingCheckoutPlanKey"));
```

**4. Ver role pré-selecionado**
- Olhar se está marcado

**5. Login + Preencher**
- Google ou Email

**6. Clicar Salvar**
- Monitorar console

**7. Copiar erro (se houver)**
```javascript
// Copiar todos os logs em [
// Especialmente qualquer linha VERMELHA
```

**8. Compartilhar**
- Copiar tudo que vê no console
- Descrever o que aconteceu
- Enviar screenshot

---

## 📞 QUANDO COMPARTILHAR, INCLUA:

```
Browser: Chrome/Firefox/Safari/Edge
Erro ocorreu em qual etapa?
- [ ] Clicando no plano
- [ ] Fazendo login
- [ ] Preenchendo dados
- [ ] Clicando Salvar
- [ ] Outro: ___

MENSAGEM DE ERRO (COMPLETA):
[Cole aqui a linha vermelha]

CONSOLE LOGS (ÚLTIMOS 10):
[Cole aqui os últimos 10 logs]

STATUS DO BUTTON:
- [ ] Não cliquei ainda
- [ ] Cliquei mas nada aconteceu
- [ ] Button ficou "Salvando"
- [ ] Outro: ___

SCREENSHOT:
[Tire foto da tela]
```

---

## ✅ VOCÊ ESTÁ PRONTO!

1. ✅ Abrir DevTools
2. ✅ Executar comandos acima quando necessário
3. ✅ Copiar mensagens de erro
4. ✅ Compartilhar comigo
5. ✅ Eu faço diagnóstico
6. ✅ Implemento fix
7. ✅ Você testa novamente

**Bora testar!** 🚀

