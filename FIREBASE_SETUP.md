# INSTRUÇÕES PARA CONFIGURAR FIREBASE CLOUD MESSAGING (FCM)

## 1. Criar Projeto Firebase

1. Acesse: https://console.firebase.google.com/
2. Clique em "Adicionar projeto" ou "Add project"
3. Nome do projeto: **FLUX Delivery**
4. Siga o assistente até completar a criação

## 2. Adicionar Aplicativo Android

1. No console do Firebase, clique no ícone do Android
2. Preencha:
   - **Nome do pacote Android**: `space.iflux.app` (mesmo do capacitor.config.ts)
   - **Apelido do app**: FLUX
   - **SHA-1** (opcional por enquanto)
3. Clique em "Registrar app"

## 3. Baixar google-services.json

1. Após registrar, faça o download do arquivo `google-services.json`
2. Coloque o arquivo em:
   ```
   android/app/google-services.json
   ```

## 4. Obter FCM Server Key

1. No Firebase Console, vá em **Configurações do Projeto** (ícone de engrenagem)
2. Aba **Cloud Messaging**
3. Copie a **Chave do servidor** (Server Key)
4. No Supabase, vá em **Project Settings** → **Edge Functions** → **Secrets**
5. Adicione uma nova secret:
   - **Name**: `FCM_SERVER_KEY`
   - **Value**: Cole a chave do servidor

## 5. Estrutura do google-services.json

O arquivo deve ter esta estrutura (EXEMPLO - use o seu próprio):

```json
{
  "project_info": {
    "project_number": "123456789012",
    "project_id": "flux-delivery",
    "storage_bucket": "flux-delivery.appspot.com"
  },
  "client": [
    {
      "client_info": {
        "mobilesdk_app_id": "1:123456789012:android:abcdef1234567890",
        "android_client_info": {
          "package_name": "space.iflux.app"
        }
      },
      "oauth_client": [],
      "api_key": [
        {
          "current_key": "AIzaSyXXXXXXXXXXXXXXXXXXXXXXXXXXXXX"
        }
      ],
      "services": {
        "appinvite_service": {
          "other_platform_oauth_client": []
        }
      }
    }
  ],
  "configuration_version": "1"
}
```

## 6. Configurar build.gradle

Adicione o plugin do Google Services no arquivo:
`android/app/build.gradle`

No final do arquivo, adicione:
```gradle
apply plugin: 'com.google.gms.google-services'
```

E no arquivo `android/build.gradle`, na seção `dependencies` do `buildscript`:
```gradle
classpath 'com.google.gms:google-services:4.4.0'
```

## 7. Testar Notificações

Após configurar, você pode testar enviando uma notificação via:

### Opção 1: Firebase Console
1. Firebase Console → **Cloud Messaging**
2. "Enviar sua primeira mensagem"
3. Preencha título e texto
4. Selecione o app Android
5. Enviar

### Opção 2: Via API (Postman/cURL)
```bash
curl -X POST https://[SEU_PROJETO].supabase.co/functions/v1/send-push-notification \
  -H "Authorization: Bearer [ANON_KEY]" \
  -H "Content-Type: application/json" \
  -d '{
    "role": "driver",
    "title": "Novo Pedido Disponível!",
    "body": "Há um novo pedido esperando por você",
    "data": {
      "type": "new_order",
      "order_id": "123"
    }
  }'
```

## IMPORTANTE

⚠️ **NÃO COMMITE** o arquivo `google-services.json` em repositórios públicos!

Adicione ao `.gitignore`:
```
android/app/google-services.json
```
