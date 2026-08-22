import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { translateGarmentError } from "@/lib/verleih.errors";
import {
  garmentInputSchema,
  historyFilterSchema,
  idSchema,
  issueLoanSchema,
  personInputSchema,
  type GarmentType,
} from "@/lib/verleih.schemas";

export type PersonDTO = {
  id: string;
  full_name: string;
  email: string | null;
  phone: string | null;
  note: string | null;
  is_active: boolean;
  open_loans: number;
};

export type GarmentDTO = {
  id: string;
  code: string;
  type: GarmentType;
  size: string | null;
  note: string | null;
  is_active: boolean;
  current: {
    loan_id: string;
    person_id: string;
    person_name: string;
    issued_at: string;
  } | null;
};

export type LoanDTO = {
  id: string;
  garment_id: string;
  garment_code: string;
  garment_type: GarmentType;
  garment_size: string | null;
  person_id: string;
  person_name: string;
  issued_at: string;
  returned_at: string | null;
  note: string | null;
};

export const listPersons = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<PersonDTO[]> => {
    const { data, error } = await context.supabase
      .from("persons")
      .select("id, full_name, email, phone, note, is_active")
      .order("full_name", { ascending: true });
    if (error) throw new Error(error.message);

    const { data: open, error: openError } = await context.supabase
      .from("loans")
      .select("person_id")
      .is("returned_at", null);
    if (openError) throw new Error(openError.message);

    const counts = new Map<string, number>();
    for (const row of open ?? []) {
      counts.set(row.person_id, (counts.get(row.person_id) ?? 0) + 1);
    }

    return (data ?? []).map((p) => ({ ...p, open_loans: counts.get(p.id) ?? 0 }));
  });

export const savePerson = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => personInputSchema.parse(input))
  .handler(async ({ data, context }) => {
    const payload = {
      full_name: data.full_name,
      email: data.email ? data.email : null,
      phone: data.phone ? data.phone : null,
      note: data.note ? data.note : null,
      is_active: data.is_active,
    };
    if (data.id) {
      const { error } = await context.supabase.from("persons").update(payload).eq("id", data.id);
      if (error) throw new Error(error.message);
      return { id: data.id };
    }
    const { data: inserted, error } = await context.supabase
      .from("persons")
      .insert(payload)
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return { id: inserted.id };
  });

export const deletePerson = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => idSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { count, error: countError } = await context.supabase
      .from("loans")
      .select("id", { count: "exact", head: true })
      .eq("person_id", data.id);
    if (countError) throw new Error(countError.message);
    if ((count ?? 0) > 0) {
      throw new Error(
        "Person hat Einträge in der Historie und kann nicht gelöscht werden. Bitte auf inaktiv setzen.",
      );
    }
    const { error } = await context.supabase.from("persons").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const listGarments = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<GarmentDTO[]> => {
    const { data, error } = await context.supabase
      .from("garments")
      .select("id, code, type, size, note, is_active")
      .order("code", { ascending: true });
    if (error) throw new Error(error.message);

    const { data: open, error: openError } = await context.supabase
      .from("loans")
      .select("id, garment_id, person_id, issued_at, persons(full_name)")
      .is("returned_at", null);
    if (openError) throw new Error(openError.message);

    const byGarment = new Map<string, GarmentDTO["current"]>();
    for (const loan of open ?? []) {
      byGarment.set(loan.garment_id, {
        loan_id: loan.id,
        person_id: loan.person_id,
        person_name: loan.persons?.full_name ?? "Unbekannt",
        issued_at: loan.issued_at,
      });
    }

    return (data ?? []).map((g) => ({ ...g, current: byGarment.get(g.id) ?? null }));
  });

export const saveGarment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => garmentInputSchema.parse(input))
  .handler(async ({ data, context }) => {
    const payload = {
      code: data.code,
      type: data.type,
      size: data.size ? data.size : null,
      note: data.note ? data.note : null,
      is_active: data.is_active,
    };
    if (data.id) {
      const { error } = await context.supabase.from("garments").update(payload).eq("id", data.id);
      if (error) throw new Error(translateGarmentError(error.message));
      return { id: data.id };
    }
    const { data: inserted, error } = await context.supabase
      .from("garments")
      .insert(payload)
      .select("id")
      .single();
    if (error) throw new Error(translateGarmentError(error.message));
    return { id: inserted.id };
  });

export const deleteGarment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => idSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("garments").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const issueLoans = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => issueLoanSchema.parse(input))
  .handler(async ({ data, context }) => {
    const rows = data.garment_ids.map((garment_id) => ({
      garment_id,
      person_id: data.person_id,
      note: data.note ? data.note : null,
      created_by: context.userId,
    }));
    const { error } = await context.supabase.from("loans").insert(rows);
    if (error) {
      if (error.message.includes("loans_one_open_per_garment")) {
        throw new Error("Mindestens ein Kleidungsstück ist bereits verliehen.");
      }
      throw new Error(error.message);
    }
    return { count: rows.length };
  });

export const returnLoan = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => idSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("loans")
      .update({ returned_at: new Date().toISOString() })
      .eq("id", data.id)
      .is("returned_at", null);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const listLoans = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => historyFilterSchema.parse(input ?? {}))
  .handler(async ({ data, context }): Promise<LoanDTO[]> => {
    let query = context.supabase
      .from("loans")
      .select(
        "id, garment_id, person_id, issued_at, returned_at, note, garments(code, type, size), persons(full_name)",
      )
      .order("issued_at", { ascending: false })
      .limit(500);

    if (data.person_id) query = query.eq("person_id", data.person_id);
    if (data.garment_id) query = query.eq("garment_id", data.garment_id);
    if (data.status === "laufend") query = query.is("returned_at", null);
    if (data.status === "zurueck") query = query.not("returned_at", "is", null);
    if (data.from) query = query.gte("issued_at", data.from);
    if (data.to) query = query.lte("issued_at", data.to);

    const { data: rows, error } = await query;
    if (error) throw new Error(error.message);

    return (rows ?? [])
      .filter((row) => (data.type ? row.garments?.type === data.type : true))
      .map((row) => ({
        id: row.id,
        garment_id: row.garment_id,
        garment_code: row.garments?.code ?? "—",
        garment_type: (row.garments?.type ?? "hose") as GarmentType,
        garment_size: row.garments?.size ?? null,
        person_id: row.person_id,
        person_name: row.persons?.full_name ?? "Unbekannt",
        issued_at: row.issued_at,
        returned_at: row.returned_at,
        note: row.note,
      }));
  });
