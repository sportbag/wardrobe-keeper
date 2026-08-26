import { z } from "zod";

export const garmentTypeSchema = z.enum(["hose", "jacke"]);
export type GarmentType = z.infer<typeof garmentTypeSchema>;

const dateField = z
  .string()
  .trim()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Ungültiges Datum")
  .optional()
  .or(z.literal(""));

export const personInputSchema = z.object({
  id: z.string().uuid().optional(),
  full_name: z.string().trim().min(1, "Name ist erforderlich"),
  email: z.string().trim().email("Ungültige E-Mail").optional().or(z.literal("")),
  phone: z.string().trim().optional().or(z.literal("")),
  note: z.string().trim().optional().or(z.literal("")),
  birth_date: dateField,
  guardian_name: z.string().trim().optional().or(z.literal("")),
  membership_start: dateField,
  membership_end: dateField,
  annual_fee: z
    .string()
    .trim()
    .regex(/^\d+([.,]\d{1,2})?$/, "Ungültiger Betrag")
    .optional()
    .or(z.literal("")),
  is_active: z.boolean().default(true),
});
export type PersonInput = z.infer<typeof personInputSchema>;

export const feePaymentSchema = z.object({
  id: z.string().uuid().optional(),
  person_id: z.string().uuid(),
  year: z.number().int().min(2000).max(2100),
  amount: z.number().min(0),
  paid_on: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Ungültiges Datum"),
  note: z.string().trim().optional().or(z.literal("")),
});
export type FeePaymentInput = z.infer<typeof feePaymentSchema>;

export const garmentInputSchema = z.object({
  id: z.string().uuid().optional(),
  code: z.string().trim().min(1, "Kennung ist erforderlich"),
  type: garmentTypeSchema,
  size: z.string().trim().optional().or(z.literal("")),
  note: z.string().trim().optional().or(z.literal("")),
  is_active: z.boolean().default(true),
});
export type GarmentInput = z.infer<typeof garmentInputSchema>;

export const issueLoanSchema = z.object({
  person_id: z.string().uuid(),
  garment_ids: z.array(z.string().uuid()).min(1, "Mindestens ein Kleidungsstück wählen"),
  note: z.string().trim().optional().or(z.literal("")),
});

export const idSchema = z.object({ id: z.string().uuid() });

export const importPersonsSchema = z.object({
  rows: z
    .array(personInputSchema.omit({ id: true }))
    .min(1, "Keine Datensätze gefunden")
    .max(500, "Maximal 500 Datensätze pro Import"),
});

export const historyFilterSchema = z.object({
  person_id: z.string().uuid().optional(),
  garment_id: z.string().uuid().optional(),
  type: garmentTypeSchema.optional(),
  status: z.enum(["alle", "laufend", "zurueck"]).default("alle"),
  from: z.string().optional(),
  to: z.string().optional(),
});
export type HistoryFilter = z.infer<typeof historyFilterSchema>;

export const GARMENT_TYPE_LABEL: Record<GarmentType, string> = {
  hose: "Hose",
  jacke: "Jacke",
};
