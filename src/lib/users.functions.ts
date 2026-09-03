import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { assertAdmin } from "@/lib/verleih.server";

export type AppUserDTO = {
  id: string;
  email: string;
  display_name: string | null;
  is_admin: boolean;
  confirmed: boolean;
  invited_at: string | null;
  last_sign_in_at: string | null;
  created_at: string;
};

export const listAppUsers = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<AppUserDTO[]> => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 200 });
    if (error) throw new Error(error.message);

    const { data: roles, error: roleError } = await supabaseAdmin
      .from("user_roles")
      .select("user_id, role");
    if (roleError) throw new Error(roleError.message);
    const { data: profiles } = await supabaseAdmin.from("profiles").select("id, display_name");

    const adminIds = new Set(
      (roles ?? []).filter((r) => r.role === "admin").map((r) => r.user_id),
    );
    const names = new Map((profiles ?? []).map((p) => [p.id, p.display_name]));

    return data.users.map((u) => ({
      id: u.id,
      email: u.email ?? "—",
      display_name: names.get(u.id) ?? null,
      is_admin: adminIds.has(u.id),
      confirmed: Boolean(u.email_confirmed_at ?? u.confirmed_at),
      invited_at: u.invited_at ?? null,
      last_sign_in_at: u.last_sign_in_at ?? null,
      created_at: u.created_at,
    }));
  });

const inviteSchema = z.object({
  email: z.string().trim().email("Ungültige E-Mail"),
  display_name: z.string().trim().optional().or(z.literal("")),
  is_admin: z.boolean().default(false),
  redirect_to: z.string().url().optional().or(z.literal("")),
});

export const inviteUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => inviteSchema.parse(input))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const options: { data?: object; redirectTo?: string } = {};
    if (data.display_name) options.data = { display_name: data.display_name };
    if (data.redirect_to) options.redirectTo = data.redirect_to;
    const { data: invited, error } = await supabaseAdmin.auth.admin.inviteUserByEmail(
      data.email,
      options,
    );
    if (error) throw new Error(error.message);

    const userId = invited.user?.id;
    if (userId) {
      const { error: roleError } = await supabaseAdmin
        .from("user_roles")
        .upsert(
          { user_id: userId, role: data.is_admin ? "admin" : "user" },
          { onConflict: "user_id,role" },
        );
      if (roleError) throw new Error(roleError.message);
    }
    return { id: userId ?? null };
  });

const roleSchema = z.object({
  user_id: z.string().uuid(),
  is_admin: z.boolean(),
});

export const setUserAdmin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => roleSchema.parse(input))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    if (data.user_id === context.userId && !data.is_admin) {
      throw new Error("Die eigenen Adminrechte können nicht entzogen werden.");
    }
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    if (data.is_admin) {
      const { error } = await supabaseAdmin
        .from("user_roles")
        .upsert({ user_id: data.user_id, role: "admin" }, { onConflict: "user_id,role" });
      if (error) throw new Error(error.message);
    } else {
      const { error } = await supabaseAdmin
        .from("user_roles")
        .delete()
        .eq("user_id", data.user_id)
        .eq("role", "admin");
      if (error) throw new Error(error.message);
      const { error: userRoleError } = await supabaseAdmin
        .from("user_roles")
        .upsert({ user_id: data.user_id, role: "user" }, { onConflict: "user_id,role" });
      if (userRoleError) throw new Error(userRoleError.message);
    }
    return { ok: true };
  });

export const deleteAppUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ user_id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    if (data.user_id === context.userId) {
      throw new Error("Das eigene Konto kann nicht gelöscht werden.");
    }
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.auth.admin.deleteUser(data.user_id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
