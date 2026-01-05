import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

type Action = "delete" | "ban" | "unban";

interface Payload {
  action: Action;
  userId: string;
}

function json(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return json(405, { success: false, error: "Method not allowed" });
  }

  try {
    const authHeader = req.headers.get("authorization") ?? req.headers.get("Authorization");
    if (!authHeader) {
      return json(401, { success: false, error: "Missing Authorization header" });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
    const supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

    if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceRoleKey) {
      throw new Error("Supabase environment is not configured");
    }

    const authClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const { data: authData, error: authError } = await authClient.auth.getUser();
    if (authError || !authData?.user) {
      return json(401, { success: false, error: "Unauthorized" });
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    // Ensure caller is admin
    const { data: callerRole, error: callerRoleError } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", authData.user.id)
      .eq("role", "admin")
      .maybeSingle();

    if (callerRoleError) {
      console.error("Error checking caller role:", callerRoleError);
      return json(500, { success: false, error: "Failed to validate caller" });
    }

    if (!callerRole) {
      return json(403, { success: false, error: "Forbidden" });
    }

    const payload = (await req.json()) as Partial<Payload>;
    const action = payload.action;
    const targetUserId = payload.userId;

    if (!action || !targetUserId) {
      return json(400, { success: false, error: "Missing action or userId" });
    }

    // Never allow operating on self
    if (targetUserId === authData.user.id) {
      return json(400, { success: false, error: "You cannot manage your own user" });
    }

    // Never allow operating on another admin
    const { data: targetAdminRole, error: targetRoleError } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", targetUserId)
      .eq("role", "admin")
      .maybeSingle();

    if (targetRoleError) {
      console.error("Error checking target role:", targetRoleError);
      return json(500, { success: false, error: "Failed to validate target" });
    }

    if (targetAdminRole) {
      return json(400, { success: false, error: "Cannot manage admin users" });
    }

    if (action === "ban" || action === "unban") {
      // Ban/unban is handled at Auth level (GoTrue)
      const banDuration = action === "ban" ? "87600h" : "none";

      const { error: banError } = await supabaseAdmin.auth.admin.updateUserById(targetUserId, {
        ban_duration: banDuration,
      } as any);

      if (banError) {
        console.error("Error banning/unbanning user:", banError);
        return json(500, { success: false, error: banError.message ?? "Failed to update user" });
      }

      return json(200, { success: true, action, userId: targetUserId });
    }

    if (action === "delete") {
      // Cleanup tables that do NOT have FKs to auth.users
      // (so we don't leave dangling references)
      await supabaseAdmin.from("delivery_audit_logs").delete().eq("driver_user_id", targetUserId);

      await supabaseAdmin
        .from("order_payments")
        .delete()
        .or(`driver_user_id.eq.${targetUserId},company_user_id.eq.${targetUserId}`);

      await supabaseAdmin
        .from("payment_history")
        .delete()
        .or(`driver_user_id.eq.${targetUserId},company_user_id.eq.${targetUserId}`);

      // Delete auth user (cascades to profiles/user_roles/company_profiles/driver_profiles/credits/notifications/etc.)
      const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(targetUserId);
      if (deleteError) {
        console.error("Error deleting auth user:", deleteError);
        return json(500, { success: false, error: deleteError.message ?? "Failed to delete user" });
      }

      return json(200, { success: true, action, userId: targetUserId });
    }

    return json(400, { success: false, error: "Invalid action" });
  } catch (error) {
    console.error("Error in admin-manage-user:", error);
    const message = error instanceof Error ? error.message : String(error);
    return json(500, { success: false, error: message });
  }
});
