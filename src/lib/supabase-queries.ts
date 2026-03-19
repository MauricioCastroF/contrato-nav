import { supabase } from "@/integrations/supabase/client";

/**
 * Local tracking data linked to SECOP contracts by id_contrato.
 * Only editable/tracking fields are stored locally.
 */

export interface LocalTracking {
  id: string;
  id_contrato: string;
  critico: string | null;
  tipo_riesgo: string | null;
  situacion: string | null;
  modif_si_no: string | null;
  fecha_modif: string | null;
  tipo_tramite: string | null;
  detalle_modif: string | null;
  adicion_si_no: string | null;
  valor_adicion: number | null;
  fecha_adicion: string | null;
  justificacion_adicion: string | null;
  observaciones: string | null;
}

/** Get local tracking data for a SECOP contract */
export async function getLocalTracking(idContrato: string): Promise<LocalTracking | null> {
  const { data, error } = await supabase
    .from("contratos_seguimiento")
    .select("*")
    .eq("id_contrato", idContrato)
    .maybeSingle();
  if (error) throw error;
  return data;
}

/** Upsert local tracking data (create if not exists, update if exists) */
export async function upsertLocalTracking(
  idContrato: string,
  updates: {
    critico?: string | null;
    tipo_riesgo?: string | null;
    situacion?: string | null;
    modif_si_no?: string | null;
    fecha_modif?: string | null;
    tipo_tramite?: string | null;
    detalle_modif?: string | null;
    adicion_si_no?: string | null;
    valor_adicion?: number | null;
    fecha_adicion?: string | null;
    justificacion_adicion?: string | null;
    observaciones?: string | null;
  }
) {
  const { data, error } = await supabase
    .from("contratos_seguimiento")
    .upsert(
      { id_contrato: idContrato, ...updates },
      { onConflict: "id_contrato" }
    )
    .select()
    .maybeSingle();
  if (error) throw error;
  return data;
}
