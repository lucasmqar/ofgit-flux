# 📱 NOTIFICAÇÕES PUSH - GUIA COMPLETO DE IMPLEMENTAÇÃO

## ✅ O QUE FOI IMPLEMENTADO

### 1. **Infraestrutura Base**
- ✅ Plugin Capacitor Push Notifications instalado
- ✅ Permissões Android configuradas (AndroidManifest.xml)
- ✅ Serviço de Push Notifications criado (`pushNotifications.ts`)
- ✅ Tabela `user_push_tokens` no banco de dados
- ✅ Edge Function `send-push-notification` criada
- ✅ Triggers automáticos no banco de dados
- ✅ Hook React `usePushNotifications` para envio fácil
- ✅ Integração com AuthContext (auto-registro após login)

### 2. **Notificações Automáticas Configuradas**

#### Para ENTREGADORES:
- 🚀 **Novo pedido disponível** - Quando empresa cria pedido

#### Para EMPRESAS:
- ✅ **Pedido aceito** - Quando entregador aceita o pedido
- 📦 **Pedido coletado** - Quando entregador coleta o pedido
- 🎉 **Pedido concluído** - Quando entregador finaliza a entrega

#### Extras (Prontos para usar):
- 💰 **Pagamento confirmado** - Quando empresa marca pagamento

---

## 🔧 O QUE VOCÊ PRECISA FAZER

### **PASSO 1: Criar Projeto Firebase** ⚠️ OBRIGATÓRIO

1. Acesse: https://console.firebase.google.com/
2. Clique em **"Adicionar projeto"**
3. Nome: **FLUX Delivery**
4. Aceite os termos e crie o projeto

### **PASSO 2: Adicionar App Android ao Firebase**

1. No Firebase Console, clique no ícone **Android** (robozinho verde)
2. Preencha:
   - **Nome do pacote**: `space.iflux.app`
   - **Apelido**: FLUX
   - **SHA-1**: (deixe em branco por enquanto)
3. Clique em **"Registrar app"**

### **PASSO 3: Baixar google-services.json** ⚠️ IMPORTANTE

1. Após registrar, clique em **"Fazer download do google-services.json"**
2. Salve o arquivo em:
   ```
   android/app/google-services.json
   ```
3. ⚠️ **NÃO commite este arquivo no Git!** (já está no .gitignore)

### **PASSO 4: Obter FCM Server Key**

1. No Firebase Console, clique na **engrenagem** ⚙️ → **Configurações do projeto**
2. Aba **Cloud Messaging**
3. Se não houver chave, clique em **"Gerenciar API no Google Cloud Console"**
4. Ative a **Firebase Cloud Messaging API**
5. Volte ao Firebase e copie a **Chave do servidor (legacy)**

### **PASSO 5: Configurar Secret no Supabase**

1. Acesse seu projeto Supabase: https://supabase.com/dashboard
2. Vá em **Project Settings** → **Edge Functions** → **Secrets**
3. Clique em **"Add new secret"**
4. Preencha:
   - **Name**: `FCM_SERVER_KEY`
   - **Value**: Cole a chave copiada do Firebase
5. Clique em **"Add secret"**

### **PASSO 6: Deploy das Edge Functions**

Execute no terminal:

```bash
cd "c:\Users\lucas\OneDrive\Desktop\FLUX - CODE\ARQUIVO BASE - FLUX V3\01 - DEPLOY\iflux-main"

# Deploy da Edge Function
supabase functions deploy send-push-notification
```

### **PASSO 7: Executar Migrations no Banco**

Execute as migrations SQL no Supabase:

1. Acesse **SQL Editor** no Supabase
2. Execute o conteúdo de:
   - `supabase/migrations/20251229_create_push_tokens_table.sql`
   - `supabase/migrations/20251229_create_push_notification_triggers.sql`

Ou via CLI:
```bash
supabase db push
```

### **PASSO 8: Configurar Secrets do Banco** (para triggers)

No SQL Editor do Supabase, execute:

```sql
-- Configurar URL e Service Role Key para triggers
ALTER DATABASE postgres SET "app.settings.supabase_url" = 'https://[SEU_PROJETO].supabase.co';
ALTER DATABASE postgres SET "app.settings.service_role_key" = '[SUA_SERVICE_ROLE_KEY]';
```

Substitua:
- `[SEU_PROJETO]` pelo ID do seu projeto Supabase
- `[SUA_SERVICE_ROLE_KEY]` pela service role key (Project Settings → API → service_role)

### **PASSO 9: Build e Teste do APK**

```bash
# Build web
npm run build

# Sync com Android
npx cap sync android

# Abrir no Android Studio
npx cap open android

# No Android Studio:
# - Build → Build Bundle(s) / APK(s) → Build APK(s)
# - Ou instale direto em device via Run
```

### **PASSO 10: Testar Notificações**

#### Método 1: Via Firebase Console
1. Firebase Console → **Cloud Messaging** → **"Enviar sua primeira mensagem"**
2. Preencha título e mensagem
3. Teste com seu device

#### Método 2: Via código (já implementado!)
Quando você criar um novo pedido, a notificação será enviada automaticamente para todos os entregadores! 🚀

---

## 📋 CHECKLIST FINAL

Antes de testar, verifique:

- [ ] Projeto Firebase criado
- [ ] App Android registrado no Firebase
- [ ] Arquivo `google-services.json` em `android/app/`
- [ ] FCM Server Key copiada
- [ ] Secret `FCM_SERVER_KEY` adicionada no Supabase
- [ ] Edge Function deployed
- [ ] Migrations executadas no banco
- [ ] Secrets do banco configuradas (supabase_url e service_role_key)
- [ ] APK buildado e instalado no device
- [ ] Permissão de notificações concedida no app

---

## 🧪 COMO TESTAR

### Teste 1: Novo Pedido (para Entregadores)
1. Entre como **empresa** no app web
2. Crie um novo pedido
3. Todos os **entregadores** com app instalado receberão notificação

### Teste 2: Pedido Aceito (para Empresa)
1. Entre como **entregador** no app
2. Aceite um pedido disponível
3. A **empresa** que criou o pedido receberá notificação

### Teste 3: Pedido Coletado
1. Como **entregador**, marque pedido como coletado
2. A **empresa** receberá notificação

### Teste 4: Pedido Concluído
1. Como **entregador**, finalize a entrega
2. A **empresa** receberá notificação

---

## 🎯 COMO USAR NO CÓDIGO

### Enviar notificação personalizada:

```typescript
import { usePushNotifications } from '@/hooks/usePushNotifications';

const { notifyNewOrderAvailable } = usePushNotifications();

// Notificar sobre novo pedido
await notifyNewOrderAvailable(orderId, 'Restaurante XYZ - Rua ABC, 123');
```

### Notificações disponíveis:
- `notifyNewOrderAvailable(orderId, details)` - Para drivers
- `notifyOrderAccepted(companyId, driverName, orderId)` - Para company
- `notifyOrderCollected(companyId, driverName, orderId)` - Para company
- `notifyOrderCompleted(companyId, driverName, orderId)` - Para company
- `notifyPaymentMarked(driverId, companyName, value)` - Para driver

---

## ⚠️ IMPORTANTE

1. **Notificações só funcionam em dispositivos reais**, não no emulador (a menos que tenha Google Play Services)
2. **Primeiro uso**: App vai pedir permissão para notificações - usuário precisa aceitar
3. **Token é salvo automaticamente** após login
4. **Token é removido automaticamente** após logout
5. **Triggers funcionam automaticamente** - você não precisa chamar nada!

---

## 🐛 TROUBLESHOOTING

### "Push notifications not working"
- Verifique se o device tem Google Play Services instalado
- Confirme que a permissão foi concedida nas configurações do app
- Verifique logs no Logcat do Android Studio

### "Error: FCM_SERVER_KEY not configured"
- Confirme que adicionou a secret no Supabase Edge Functions
- Verifique se o nome está exatamente como `FCM_SERVER_KEY`

### "No tokens found"
- Usuário precisa fazer login pelo menos uma vez no app mobile
- Verifique tabela `user_push_tokens` no Supabase

### "Notification sent but not received"
- Verifique se o app está em foreground ou background
- Teste com app totalmente fechado
- Verifique FCM logs no Firebase Console

---

## 📚 ARQUIVOS CRIADOS/MODIFICADOS

1. ✅ `src/services/pushNotifications.ts` - Serviço principal
2. ✅ `src/hooks/usePushNotifications.ts` - Hook React
3. ✅ `src/contexts/AuthContext.tsx` - Integração com login/logout
4. ✅ `supabase/migrations/20251229_create_push_tokens_table.sql`
5. ✅ `supabase/migrations/20251229_create_push_notification_triggers.sql`
6. ✅ `supabase/functions/send-push-notification/index.ts`
7. ✅ `android/app/src/main/AndroidManifest.xml` - Permissões
8. ✅ `.gitignore` - Ignorar google-services.json

---

Boa sorte com as notificações! 🚀📱
