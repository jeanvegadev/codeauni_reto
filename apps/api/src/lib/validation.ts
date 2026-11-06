import { z } from "zod";

import { EQUIPMENT_TYPES } from "./maintenance";

const codeSchema = z
  .string()
  .trim()
  .min(2, "El código debe tener al menos 2 caracteres.")
  .max(20, "El código no puede superar los 20 caracteres.")
  .transform((value) => value.toUpperCase())
  .refine(
    (value) => /^[A-Z0-9-]+$/.test(value),
    "Usa solo letras, números y guiones (ej. CAM-001).",
  );

const hoursSchema = z
  .number()
  .finite("El horómetro debe ser un número válido.")
  .min(0, "El horómetro no puede ser negativo.")
  .max(1_000_000, "El horómetro supera el máximo permitido.");

const notesSchema = z
  .string()
  .trim()
  .max(500, "Las notas no pueden superar los 500 caracteres.");

export const createEquipmentSchema = z
  .object({
    code: codeSchema,
    type: z.enum(EQUIPMENT_TYPES, {
      message: "El tipo debe ser TRUCK, EXCAVATOR o DRILL.",
    }),
    currentHours: hoursSchema,
  })
  .strict();

export const updateEquipmentSchema = z
  .object({
    code: codeSchema.optional(),
    type: z.enum(EQUIPMENT_TYPES, {
      message: "El tipo debe ser TRUCK, EXCAVATOR o DRILL.",
    }).optional(),
    currentHours: hoursSchema.optional(),
  })
  .strict()
  .refine(
    (value) => Object.keys(value).length > 0,
    "Envía al menos un campo para actualizar.",
  );

export const createMaintenanceSchema = z
  .object({
    hoursAtService: hoursSchema.optional(),
    notes: notesSchema.optional(),
  })
  .strict();

export type CreateEquipmentInput = z.infer<typeof createEquipmentSchema>;
export type UpdateEquipmentInput = z.infer<typeof updateEquipmentSchema>;
export type CreateMaintenanceInput = z.infer<typeof createMaintenanceSchema>;
