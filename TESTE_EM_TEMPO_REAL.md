# 🎯 PLANO DE AÇÃO - TESTE EM TEMPO REAL

## Situação Atual
✅ Deploy completado com:
- Timeout aumentado para 20s (e opção para 25s se necessário)
- Logging DETALHADO em cada etapa (✅, ❌, 🔄)
- UI melhorada mostrando que role foi auto-detectado
- Error handling robusto com try/catch/finally

---

## 🚀 COMO VAMOS TESTAR (SIM, EU AQUI + VOCÊ)

### **Passo 1: Preparação (Você)**
```
1. Abrir https://iflux.space em aba ANÔNIMA (Ctrl+Shift+N)
2. Abrir DevTools (F12)
3. Ir para aba "Console"
4. Manter DevTools aberto durante TODO o teste
5. Limpar console: console.clear()
```

### **Passo 2: Eu verifico seu setup (Você compartilha)**
Copie e cole NO CONSOLE:
```javascript
console.log('=== DIAGNÓSTICO INICIAL ===');
console.log('URL:', window.location.href);
console.log('Storage limpo?', sessionStorage.length === 0);
console.log('Token autenticado?', !!localStorage.getItem('sb-' + location.hostname.split('.')[0] + '-auth-token'));
```

**Compartilhe comigo o output:**
```
=== DIAGNÓSTICO INICIAL ===
URL: https://iflux.space/
Storage limpo? true
Token autenticado? false
```

---

### **Passo 3: Teste Auto-Detecção de Plano (Você)**
```
1. Clicar em "Plano Empresa - 15 Dias" (ou outro)
2. Aguardar redirecionamento para /login
3. Copiar NO CONSOLE:
```
```javascript
console.log('=== PLANO DETECTADO ===');
const pending = sessionStorage.getItem("pendingCheckoutPlanKey");
console.log('Pending Plan:', pending);
console.log('Role será:', pending?.startsWith('company') ? 'EMPRESA' : pending?.startsWith('driver') ? 'ENTREGADOR' : 'DESCONHECIDO');
```

**Compartilhe:**
```
=== PLANO DETECTADO ===
Pending Plan: company_15d
Role será: EMPRESA
```

---

### **Passo 4: Verificar UI de Auto-Seleção (Você)**
```
1. Olhar na tela de login
2. Verificar se "Empresa" está com:
   ✓ MARCADO (radio button selecionado)
   ✓ Border AZUL ao redor
   ✓ Info box AZUL mostrando "Baseado no plano company_15d"
3. Descrever para mim o que vê
```

**Esperado:**
- Info box azul com texto "Baseado no plano "company_15d""
- Botão "Empresa" visualmente selecionado (marcado com ✓)
- Descrição "Cadastro para empresas e negócios" visível

**Se NÃO está assim:**
- Clique em "Empresa" manualmente
- Compartilhe screenshot da tela

---

### **Passo 5: Teste Google OAuth (Você)**
```
1. Clicar em "Continuar com Google"
2. Fazer login com conta Google
3. Aguardar redirecionamento
```

**IMPORTANTE**: Monitore o CONSOLE durante esse tempo!

**Depois, compartilhe:**
- Qual tela você caiu? (role selection vs. profile completion)
- Há erros VERMELHOS no console?
- Que logs aparecem começando com `[`?

---

### **Passo 6: Monitorar Save (Você + Eu)**
```
1. Você preenche todos os campos de empresa:
   - Razão Social: FLUX Logística LTDA
   - CNPJ: 12.345.678/0001-90
   - Cidade: Goiânia
   
2. Clica "Salvar e Continuar"

3. EU monitoro seu console em TEMPO REAL
```

**O que eu vou procurar:**
```
✅ [handleCompleteProfile] INICIANDO perfil save...
✅ [handleCompleteProfile] Salvando company_profiles...
✅ [handleCompleteProfile] ✅ Company profile salvo
✅ [handleCompleteProfile] ✅ Refresh() completo
✅ [handleCompleteProfile] Inicializando checkout
✅ [createStripeCheckout] Refreshing session (timeout 20s)...
✅ [createStripeCheckout] Session refreshed OK
✅ [createStripeCheckout] Resposta status: 200
```

**O que NÃO deverá aparecer:**
```
❌ ❌ Qualquer linha VERMELHA de erro
❌ RLS policy bloqueando
❌ relation does not exist
❌ timeout
```

---

## 📱 COMO COMPARTILHAR INFORMAÇÕES COMIGO

### **Se FUNCIONAR:**
```
✅ SUCESSO!

Tela após save: [qual tela você viu?]
Console final mostra: [última linha do console]
Token de checkout: [URL começa com https://checkout.stripe.com?]
```

### **Se FALHAR - Enviar EXATAMENTE ISSO:**

```
❌ ERRO NO TESTE

Etapa que falhou: [qual? save? auth? stripe?]

LINHA VERMELHA DO CONSOLE (COMPLETA):
[Cole aqui a linha INTEIRA de erro - ex: "Error: permission denied for table profiles"]

ÚLTIMOS 5 LOGS:
[Copie as 5 linhas ANTES do erro]

SCREENSHOT:
[Tire print da tela mostrando os campos preenchidos]

ESPECIFICAÇÕES:
- Navegador: [Chrome/Firefox/Safari/Edge]
- Sistema: [Windows/Mac/Linux]
- Conexão: [WiFi/Cabo]
```

---

## 🔧 SE TRAVAR NO "SALVANDO"

**Você faz:**
```javascript
// NO CONSOLE, quando estiver travado:
console.log('Button disabled?', document.querySelector('button[disabled]') ? 'SIM - TRAVADO' : 'NÃO');

// Força parar o loading
setCompletionBusy = false; // (se existir acesso global)

// Ou simplesmente recarrega
location.reload();
```

**Eu implemento:**
- Adicionar timeout forçado (30s = para automático)
- Melhorar mensagem ao usuário ("pode demorar até 30s")
- Implementar "Cancel" button se quiser desistir

---

## 🎬 TIMELINE ESPERADO

### Se TUDO funcionar:
```
00:00 - Você clica no plano
00:05 - Redireciona para /login, role pré-selecionado
00:10 - Google OAuth
00:15 - Tela de perfil
00:20 - Preenche dados
00:25 - Clica "Salvar"
00:30 - [LOGS começam] ✅ ✅ ✅ 
00:45 - Redireciona para Stripe
01:00 - Modal do Stripe abre
```

### Se TRAVAR:
```
00:00-00:45 - [Tudo normal]
00:45 - Clica "Salvar"
01:00 - Botão "Salvando" (travado aqui)
01:15 - Você pausa, compartilha erro comigo
01:20 - Eu analisaizo
01:25 - Eu implemento fix
01:30 - Você testa novamente
```

---

## 📋 CHECKLIST FINAL

Antes de começar o teste, confirme:

- [ ] Browser aberto em aba ANÔNIMA
- [ ] DevTools aberto (F12)
- [ ] Console limpo (console.clear())
- [ ] Sem outras abas de autenticação abertas
- [ ] Conexão internet estável
- [ ] Você tem acesso a uma conta Google
- [ ] Você tem dados fictícios prontos (CNPJ, empresa, etc)

---

## 🆘 CONTATO DURANTE TESTE

Qualquer coisa durante teste:
1. **Pare** (não feche o browser)
2. **Copie os logs** do console
3. **Compartilhe comigo** TUDO que pedei acima
4. **Aguarde** minha análise (alguns minutos)
5. **Eu implemento** fix
6. **Você testa de novo**

---

## 📞 ESTOU PRONTO

Assim que você disser "Vou começar!", vou:

1. ✅ Monitorar GitHub commits (seu PR se houver)
2. ✅ Acompanhar seus logs em tempo real
3. ✅ Fazer diagnóstico preciso do erro
4. ✅ Implementar fix específico
5. ✅ Fazer novo deploy
6. ✅ Validar com você

**Não vamos adivinhar nada. Vamos SABER exatamente onde está o problema.**

Avisa quando começar! 🚀

