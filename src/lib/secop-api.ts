const SECOP_BASE = "https://www.datos.gov.co/resource/jbjy-vk9h.json";
const ENTIDAD_FILTER = `upper(nombre_entidad) like '%RAMA JUDICIAL%SECCIONAL%'`;

export interface SecopContrato {
  nombre_entidad: string;
  nit_entidad: string;
  departamento: string;
  ciudad: string;
  proceso_de_compra: string;
  id_contrato: string;
  referencia_del_contrato: string;
  estado_contrato: string;
  descripcion_del_proceso: string;
  tipo_de_contrato: string;
  modalidad_de_contratacion: string;
  fecha_de_firma: string;
  fecha_de_inicio_del_contrato: string;
  fecha_de_fin_del_contrato: string;
  proveedor_adjudicado: string;
  documento_proveedor: string;
  valor_del_contrato: string;
  valor_facturado: string;
  valor_pagado: string;
  valor_pendiente_de_pago: string;
  valor_pendiente_de_ejecucion: string;
  objeto_del_contrato: string;
  duraci_n_del_contrato: string;
  nombre_supervisor: string;
  urlproceso?: { url: string };
  dias_adicionados: string;
  ultima_actualizacion: string;
}

function buildUrl(params: Record<string, string>): string {
  const url = new URL(SECOP_BASE);
  for (const [k, v] of Object.entries(params)) {
    url.searchParams.set(k, v);
  }
  return url.toString();
}

async function fetchSecop<T>(params: Record<string, string>): Promise<T> {
  const res = await fetch(buildUrl(params));
  if (!res.ok) throw new Error(`SECOP API error: ${res.status}`);
  return res.json();
}

/** Extract seccional name from nombre_entidad */
function extractSeccional(nombre: string): string {
  // Match the city name after the last "Judicial de" — handles various dash/special chars
  const match = nombre.match(/Judicial\s+de\s+(.+)$/i);
  if (!match) return nombre.trim();
  return match[1].trim().replace(/\.$/, "").toUpperCase();
}

/** Get distinct years from fecha_de_firma */
export async function getSecopYears(): Promise<number[]> {
  const data = await fetchSecop<Array<{ year: string }>>({
    $query: `SELECT date_extract_y(fecha_de_firma) as year WHERE ${ENTIDAD_FILTER} GROUP BY date_extract_y(fecha_de_firma) ORDER BY year DESC`,
  });
  return data.map((d) => Number(d.year)).filter((y) => !isNaN(y));
}

/** Get distinct months for a year */
export async function getSecopMonths(year: number): Promise<number[]> {
  const data = await fetchSecop<Array<{ month: string }>>({
    $query: `SELECT date_extract_m(fecha_de_firma) as month WHERE ${ENTIDAD_FILTER} AND date_extract_y(fecha_de_firma) = ${year} GROUP BY date_extract_m(fecha_de_firma) ORDER BY month ASC`,
  });
  return data.map((d) => Number(d.month)).filter((m) => !isNaN(m));
}

/** Get distinct seccionales for a year+month */
export async function getSecopSeccionales(year: number, month: number): Promise<string[]> {
  const data = await fetchSecop<Array<{ nombre_entidad: string }>>({
    $query: `SELECT nombre_entidad WHERE ${ENTIDAD_FILTER} AND date_extract_y(fecha_de_firma) = ${year} AND date_extract_m(fecha_de_firma) = ${month} GROUP BY nombre_entidad ORDER BY nombre_entidad ASC`,
  });
  return data.map((d) => extractSeccional(d.nombre_entidad));
}

/** Get contracts list for filters */
export async function getSecopContratos(
  year: number,
  month: number,
  seccional: string
): Promise<Array<{ id_contrato: string; proveedor_adjudicado: string }>> {
  const data = await fetchSecop<SecopContrato[]>({
    $query: `SELECT id_contrato, proveedor_adjudicado WHERE ${ENTIDAD_FILTER} AND date_extract_y(fecha_de_firma) = ${year} AND date_extract_m(fecha_de_firma) = ${month} AND upper(nombre_entidad) like '%${seccional}%' ORDER BY id_contrato ASC LIMIT 1000`,
  });
  return data.map((d) => ({
    id_contrato: d.id_contrato,
    proveedor_adjudicado: d.proveedor_adjudicado || "Sin proveedor",
  }));
}

/** Get full contract detail from SECOP */
export async function getSecopContratoDetail(idContrato: string): Promise<SecopContrato | null> {
  const data = await fetchSecop<SecopContrato[]>({
    $query: `SELECT * WHERE id_contrato = '${idContrato}' LIMIT 1`,
  });
  return data[0] || null;
}
