// Follow this setup guide to integrate the Deno language server with your editor:
// https://deno.land/manual/getting_started/setup_your_environment
// This enables autocomplete, go to definition, etc.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface NotificationPayload {
  user_ids?: string[];
  role?: 'driver' | 'company';
  platform?: 'android' | 'ios' | 'web';
  city?: string;
  state?: string;
  title: string;
  body: string;
  data?: Record<string, any>;
}

function intersectStrings(a: string[], b: string[]): string[] {
  const setB = new Set(b);
  return a.filter((v) => setB.has(v));
}

function normalizeOptionalText(value?: string | null): string | null {
  const trimmed = (value ?? '').trim();
  return trimmed ? trimmed : null;
}

function isFcmInvalidToken(result: any): boolean {
  try {
    const raw = JSON.stringify(result ?? {});
    return raw.includes('UNREGISTERED') || raw.includes('registration-token-not-registered') || raw.includes('INVALID_ARGUMENT');
  } catch {
    return false;
  }
}

function base64UrlEncode(input: string): string {
  const b64 = btoa(input);
  return b64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

function base64UrlEncodeBytes(bytes: Uint8Array): string {
  const b64 = btoa(String.fromCharCode(...bytes));
  return b64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

function extractPkcs8DerFromPrivateKey(privateKey: string): Uint8Array {
  const trimmed = (privateKey ?? '').trim();
  if (!trimmed) throw new Error('Firebase private_key is empty');

  // Most service accounts provide PEM PKCS8.
  const withoutHeaders = trimmed
    .replace(/-----BEGIN PRIVATE KEY-----/g, '')
    .replace(/-----END PRIVATE KEY-----/g, '')
    .replace(/\s+/g, '');

  try {
    const binary = atob(withoutHeaders);
    return Uint8Array.from(binary, (c) => c.charCodeAt(0));
  } catch (e) {
    // If parsing fails, surface a clearer message.
    throw new Error(`Invalid Firebase private_key PEM/base64: ${String((e as any)?.message ?? e)}`);
  }
}

// Function to get OAuth2 access token from service account
async function getAccessToken(serviceAccount: any): Promise<string> {
  const jwtHeader = base64UrlEncode(JSON.stringify({ alg: 'RS256', typ: 'JWT' }))
  const now = Math.floor(Date.now() / 1000)
  const jwtClaimSet = {
    iss: serviceAccount.client_email,
    scope: 'https://www.googleapis.com/auth/firebase.messaging',
    aud: 'https://oauth2.googleapis.com/token',
    exp: now + 3600,
    iat: now,
  }
  const jwtClaimSetEncoded = base64UrlEncode(JSON.stringify(jwtClaimSet))
  
  // Import private key
  const privateKey = serviceAccount.private_key
  const binaryDer = extractPkcs8DerFromPrivateKey(privateKey)
  
  const key = await crypto.subtle.importKey(
    'pkcs8',
    binaryDer,
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['sign']
  )
  
  const signature = await crypto.subtle.sign(
    'RSASSA-PKCS1-v1_5',
    key,
    new TextEncoder().encode(`${jwtHeader}.${jwtClaimSetEncoded}`)
  )
  
  const signatureBase64 = base64UrlEncodeBytes(new Uint8Array(signature))
  
  const jwt = `${jwtHeader}.${jwtClaimSetEncoded}.${signatureBase64}`
  
  // Exchange JWT for access token
  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${jwt}`,
  })
  
  const data = await response.json().catch(() => ({}))
  if (!response.ok || !data?.access_token) {
    throw new Error(`OAuth token exchange failed (status=${response.status}): ${JSON.stringify(data)}`)
  }
  return data.access_token
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    console.log('=== PUSH NOTIFICATION REQUEST ===')
    console.log('Method:', req.method)
    console.log('Headers:', Object.fromEntries(req.headers.entries()))

    // Validate caller JWT (required). We do this inside the function so we can
    // disable gateway JWT verification (verify_jwt=false) without making the
    // endpoint public.
    const authHeader = req.headers.get('authorization') ?? req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(
        JSON.stringify({ success: false, error: 'Missing Authorization header' }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 401,
        }
      )
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''

    if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceRoleKey) {
      console.error('Missing Supabase env vars')
      throw new Error('Supabase environment is not configured')
    }

    const authClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
      auth: { persistSession: false, autoRefreshToken: false },
    })

    const { data: authData, error: authError } = await authClient.auth.getUser()
    if (authError || !authData?.user) {
      console.error('Unauthorized:', authError)
      return new Response(
        JSON.stringify({ success: false, error: 'Unauthorized' }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 401,
        }
      )
    }
    console.log('Caller user:', authData.user.id)
    
    const supabaseClient = createClient(
      supabaseUrl,
      supabaseServiceRoleKey
    )

    const payload: NotificationPayload = await req.json()
    console.log('Push notification payload:', JSON.stringify(payload, null, 2))

    // Get Firebase Service Account from environment
    const serviceAccountJson = Deno.env.get('FIREBASE_SERVICE_ACCOUNT')
    if (!serviceAccountJson) {
      console.error('FIREBASE_SERVICE_ACCOUNT not found in environment')
      throw new Error('FIREBASE_SERVICE_ACCOUNT not configured')
    }
    
    console.log('Firebase Service Account found, project:', serviceAccountJson.substring(0, 50) + '...')
    
    const serviceAccount = JSON.parse(serviceAccountJson)
    const projectId = serviceAccount.project_id
    
    console.log('Project ID:', projectId)
    
    // Get OAuth2 access token
    console.log('Getting OAuth2 access token...')
    const accessToken = await getAccessToken(serviceAccount)
    console.log('Access token obtained')

    // Resolve target users (role + explicit user_ids)
    console.log('Querying tokens for user_ids:', payload.user_ids, 'role:', payload.role)

    let targetUserIds: string[] | null = null

    const explicitIds = (payload.user_ids ?? []).filter(Boolean)
    if (explicitIds.length > 0) {
      targetUserIds = explicitIds
    }

    if (payload.role) {
      const { data: roleRows, error: roleError } = await supabaseClient
        .from('user_roles')
        .select('user_id')
        .eq('role', payload.role)

      if (roleError) {
        console.error('Error fetching user roles:', roleError)
        throw roleError
      }

      const roleUserIds = (roleRows ?? []).map((r: any) => r.user_id).filter(Boolean)
      targetUserIds = targetUserIds ? intersectStrings(targetUserIds, roleUserIds) : roleUserIds
    }

    // Optional region filter (city/state) when role targeting is used.
    // This keeps pushes scoped to the city of the order (or chosen region).
    const city = normalizeOptionalText(payload.city)
    const state = normalizeOptionalText(payload.state)

    if (payload.role && city) {
      const profileTable = payload.role === 'driver' ? 'driver_profiles' : 'company_profiles'
      let regionQuery = supabaseClient
        .from(profileTable)
        .select('user_id')
        .eq('city', city)

      if (state) {
        regionQuery = regionQuery.eq('state', state)
      }

      const { data: regionRows, error: regionError } = await regionQuery
      if (regionError) {
        console.error('Error fetching region users:', regionError)
        throw regionError
      }

      const regionUserIds = (regionRows ?? []).map((r: any) => r.user_id).filter(Boolean)
      targetUserIds = targetUserIds ? intersectStrings(targetUserIds, regionUserIds) : regionUserIds

      console.log(`Region filter applied (role=${payload.role}, city=${city}${state ? `, state=${state}` : ''}): ${regionUserIds.length} users in region`) 
    } else if ((payload.city || payload.state) && !payload.role) {
      console.log('Region provided without role; ignoring region filter (requires role=driver|company)')
    }

    // Default to android tokens when platform is not provided
    const platform = payload.platform ?? 'android'

    let tokensQuery = supabaseClient
      .from('user_push_tokens')
      .select('token, user_id, platform')
      .eq('platform', platform)

    if (targetUserIds && targetUserIds.length > 0) {
      tokensQuery = tokensQuery.in('user_id', targetUserIds)
    }

    const { data: tokens, error: tokensError } = await tokensQuery

    if (tokensError) {
      console.error('Error fetching tokens:', tokensError)
      throw tokensError
    }

    if (!tokens || tokens.length === 0) {
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'No tokens found for specified users',
          sent: 0 
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200 
        }
      )
    }

    console.log(`Sending push notification to ${tokens.length} devices (platform=${platform})`)

    // Send notification to each token via FCM v1 API
    const results = await Promise.allSettled(
      tokens.map(async (tokenData: any) => {
        const fcmPayload = {
          message: {
            token: tokenData.token,
            notification: {
              title: payload.title,
              body: payload.body,
            },
            data: payload.data || {},
            android: {
              priority: 'high',
              notification: {
                sound: 'default',
                channel_id: 'orders',
              }
            },
          }
        }

        const response = await fetch(
          `https://fcm.googleapis.com/v1/projects/${projectId}/messages:send`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${accessToken}`,
            },
            body: JSON.stringify(fcmPayload),
          }
        )

        const result = await response.json().catch(() => ({}))
        const ok = response.ok
        console.log(`FCM response for token ${tokenData.token.substring(0, 10)}... status=${response.status}`, result)

        // If token is invalid, remove it from database
        if (!ok && isFcmInvalidToken(result)) {
          await supabaseClient.from('user_push_tokens').delete().eq('token', tokenData.token)
          console.log('Removed invalid token from database')
        }

        return { ok, status: response.status, result }
      })
    )

    const fulfilled = results.filter((r: any) => r.status === 'fulfilled').map((r: any) => r.value)
    const rejected = results.filter((r: any) => r.status === 'rejected').map((r: any) => r.reason)

    const successCount = fulfilled.filter((v: any) => v?.ok).length
    const failureCount = fulfilled.filter((v: any) => !v?.ok).length + rejected.length

    return new Response(
      JSON.stringify({ 
        success: true,
        sent: successCount,
        failed: failureCount,
        total: tokens.length,
        results: results.map((r: any) => r.status === 'fulfilled' ? r.value : r.reason)
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    )
  } catch (error) {
    console.error('=== ERROR IN PUSH NOTIFICATION ===')
    console.error('Error:', error)
    console.error('Error message:', error.message)
    console.error('Error stack:', error.stack)
    
    return new Response(
      JSON.stringify({ 
        error: error.message,
        success: false,
        details: error.stack
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    )
  }
})
