import { supabase } from "@/integrations/supabase/client";

export async function getDistinctYears() {
  const { data, error } = await supabase
    .from("contratos_seccionales")
    .select("ano")
    .order("ano", { ascending: false });
  if (error) throw error;
  return [...new Set(data.map((d) => d.ano))];
}

export async function getDistinctMonths(ano: number) {
  const { data, error } = await supabase
    .from("contratos_seccionales")
    .select("mes")
    .eq("ano", ano)
    .order("mes");
  if (error) throw error;
  return [...new Set(data.map((d) => d.mes))];
}

export async function getDistinctSeccionales(ano: number, mes: number) {
  const { data, error } = await supabase
    .from("contratos_seccionales")
    .select("seccional")
    .eq("ano", ano)
    .eq("mes", mes);
  if (error) throw error;
  return [...new Set(data.map((d) => d.seccional))];
}

export async function getContratos(ano: number, mes: number, seccional: string) {
  const { data, error } = await supabase
    .from("contratos_seccionales")
    .select("n_contrato, contratista")
    .eq("ano", ano)
    .eq("mes", mes)
    .eq("seccional", seccional);
  if (error) throw error;
  return data;
}

export async function getContratoDetail(nContrato: string) {
  const { data, error } = await supabase
    .from("contratos_seccionales")
    .select("*")
    .eq("n_contrato", nContrato)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function updateContrato(
  id: string,
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
    .from("contratos_seccionales")
    .update(updates)
    .eq("id", id)
    .select()
    .maybeSingle();
  if (error) throw error;
  return data;
}
