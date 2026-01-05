import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.89.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

// Generate 6-character alphanumeric code
function generateCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let result = '';
  for (let i = 0; i < 6; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

// Hash code using SHA-256
async function hashCode(code: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(code);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { orderId, driverUserId } = await req.json();

    if (!orderId || !driverUserId) {
      return new Response(
        JSON.stringify({ error: 'orderId and driverUserId are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Processing order ${orderId} for driver ${driverUserId}`);

    // Create Supabase client with service role
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Verify the order exists and is assigned to this driver
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('*')
      .eq('id', orderId)
      .eq('driver_user_id', driverUserId)
      .eq('status', 'accepted')
      .single();

    if (orderError || !order) {
      console.error('Order not found or not assigned:', orderError);
      return new Response(
        JSON.stringify({ error: 'Order not found or not assigned to this driver' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get all deliveries for this order
    const { data: deliveries, error: deliveriesError } = await supabase
      .from('order_deliveries')
      .select('*')
      .eq('order_id', orderId);

    if (deliveriesError) {
      console.error('Error fetching deliveries:', deliveriesError);
      throw deliveriesError;
    }

    console.log(`Found ${deliveries?.length || 0} deliveries`);

    let generatedCount = 0;
    let failedCount = 0;
    const results: { deliveryId: string; success: boolean; error?: string }[] = [];

    // Process each delivery - only generate codes, no SMS sending
    for (const delivery of deliveries || []) {
      // Skip if code already generated
      if (delivery.delivery_code) {
        console.log(`Delivery ${delivery.id} already has code, skipping`);
        results.push({ deliveryId: delivery.id, success: true });
        generatedCount++;
        continue;
      }

      // Generate new code
      const code = generateCode();
      const codeHash = await hashCode(code);

      // Update delivery with code hash AND original code for company visibility
      const { error: updateError } = await supabase
        .from('order_deliveries')
        .update({
          code_hash: codeHash,
          delivery_code: code,
          // Note: code_sent_at will be set by the company when they send via WhatsApp
        })
        .eq('id', delivery.id);

      if (updateError) {
        console.error(`Error updating delivery ${delivery.id}:`, updateError);
        results.push({ deliveryId: delivery.id, success: false, error: 'Database update failed' });
        failedCount++;
        continue;
      }

      console.log(`Code generated for delivery ${delivery.id}`);
      generatedCount++;
      results.push({ deliveryId: delivery.id, success: true });
    }

    console.log(`Completed: ${generatedCount} codes generated, ${failedCount} failed`);

    return new Response(
      JSON.stringify({
        success: true,
        generated: generatedCount,
        failed: failedCount,
        results,
        message: 'Códigos gerados. A empresa deve enviar os códigos aos clientes via WhatsApp.',
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in send-delivery-codes:', error);
    return new Response(
      JSON.stringify({ error: String(error) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
