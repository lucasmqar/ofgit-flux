import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.89.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    // Create admin client with service role key
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

    console.log('Starting admin setup...');

    // Step 1: Get all existing users
    const { data: existingUsers, error: listError } = await supabaseAdmin.auth.admin.listUsers();
    
    if (listError) {
      console.error('Error listing users:', listError);
      throw listError;
    }

    console.log(`Found ${existingUsers?.users?.length || 0} existing users`);

    // Step 2: Delete all existing users
    if (existingUsers?.users) {
      for (const user of existingUsers.users) {
        console.log(`Deleting user: ${user.email}`);
        
        // Delete from user_roles first
        await supabaseAdmin.from('user_roles').delete().eq('user_id', user.id);
        
        // Delete from profiles
        await supabaseAdmin.from('profiles').delete().eq('id', user.id);
        
        // Delete from company_profiles
        await supabaseAdmin.from('company_profiles').delete().eq('user_id', user.id);
        
        // Delete from driver_profiles
        await supabaseAdmin.from('driver_profiles').delete().eq('user_id', user.id);
        
        // Delete from credits
        await supabaseAdmin.from('credits').delete().eq('user_id', user.id);
        
        // Delete from notifications
        await supabaseAdmin.from('notifications').delete().eq('user_id', user.id);
        
        // Delete from admin_alerts
        await supabaseAdmin.from('admin_alerts').delete().eq('target_user_id', user.id);
        
        // Delete the auth user
        const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(user.id);
        if (deleteError) {
          console.error(`Error deleting user ${user.email}:`, deleteError);
        } else {
          console.log(`Successfully deleted user: ${user.email}`);
        }
      }
    }

    // Step 3: Create admin user
    console.log('Creating admin user...');
    
    const { data: adminUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email: 'admin@flux.app',
      password: 'admin2',
      email_confirm: true, // Auto-confirm email
      user_metadata: {
        name: 'Administrador',
        role: 'admin'
      }
    });

    if (createError) {
      console.error('Error creating admin user:', createError);
      throw createError;
    }

    console.log('Admin user created:', adminUser.user?.id);

    // Step 4: Create profile for admin (trigger should handle this, but let's ensure)
    const { error: profileError } = await supabaseAdmin.from('profiles').upsert({
      id: adminUser.user!.id,
      name: 'Administrador',
      email: 'admin@flux.app',
      phone: null
    });

    if (profileError) {
      console.error('Error creating profile:', profileError);
    }

    // Step 5: Assign admin role (trigger should handle this, but let's ensure)
    const { error: roleError } = await supabaseAdmin.from('user_roles').upsert({
      user_id: adminUser.user!.id,
      role: 'admin'
    });

    if (roleError) {
      console.error('Error assigning admin role:', roleError);
    }

    console.log('Admin setup complete!');

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Admin user created successfully',
        admin: {
          email: 'admin@flux.app',
          password: 'admin2',
          id: adminUser.user?.id
        }
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error: unknown) {
    console.error('Error in setup-admin:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({
        success: false,
        error: errorMessage
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
