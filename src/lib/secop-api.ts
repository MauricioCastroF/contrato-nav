/**
 * SECOP II – Procesos de Contratación (datos.gov.co, dataset p6dx-8zbt),
 * consultado mediante la API SODA v3 (`/api/v3/views/{id}/query.json`).
 *
 * Los registros del dataset se normalizan a `SecopContrato` para que el resto
 * de la aplicación siga trabajando con la misma forma de datos.
 */
const SECOP_BASE = "https://www.datos.gov.co/api/v3/views/p6dx-8zbt/query.json";
const SECOP_APP_TOKEN: string | undefined = import.meta.env.VITE_SOCRATA_APP_TOKEN;
/** Fecha usada para los filtros de año/mes y para ordenar */
const FECHA_FIELD = "fecha_de_publicacion_del";
/** Solo se consultan procesos publicados desde esta fecha */
const FECHA_PUBLICACION_DESDE = "2026-01-01T00:00:00";
const ENTIDAD_WHERE = `(caseless_contains(\`entidad\`, "ADMINISTRACIÓN JUDICIAL") OR caseless_contains(\`entidad\`, "DESAJ")) AND \`${FECHA_FIELD}\` >= "${FECHA_PUBLICACION_DESDE}"`;
const PAGE_SIZE = 1000;
const REQUEST_TIMEOUT_MS = 30000;

const PROCESO_FIELDS = [
  "entidad",
  "nit_entidad",
  "departamento_entidad",
  "ciudad_entidad",
  "ordenentidad",
  "codigo_pci",
  "id_del_proceso",
  "referencia_del_proceso",
  "ppi",
  "id_del_portafolio",
  "nombre_del_procedimiento",
  "descripci_n_del_procedimiento",
  "fase",
  "fecha_de_publicacion_del",
  "fecha_de_ultima_publicaci",
  "fecha_de_publicacion_fase",
  "fecha_de_publicacion_fase_1",
  "fecha_de_publicacion",
  "fecha_de_publicacion_fase_2",
  "fecha_de_publicacion_fase_3",
  "precio_base",
  "modalidad_de_contratacion",
  "justificaci_n_modalidad_de",
  "duracion",
  "unidad_de_duracion",
  "fecha_de_recepcion_de",
  "fecha_de_apertura_de_respuesta",
  "fecha_de_apertura_efectiva",
  "ciudad_de_la_unidad_de",
  "nombre_de_la_unidad_de",
  "proveedores_invitados",
  "proveedores_con_invitacion",
  "visualizaciones_del",
  "proveedores_que_manifestaron",
  "respuestas_al_procedimiento",
  "respuestas_externas",
  "conteo_de_respuestas_a_ofertas",
  "proveedores_unicos_con",
  "numero_de_lotes",
  "estado_del_procedimiento",
  "id_estado_del_procedimiento",
  "adjudicado",
  "id_adjudicacion",
  "codigoproveedor",
  "departamento_proveedor",
  "ciudad_proveedor",
  "fecha_adjudicacion",
  "valor_total_adjudicacion",
  "nombre_del_adjudicador",
  "nombre_del_proveedor",
  "nit_del_proveedor_adjudicado",
  "codigo_principal_de_categoria",
  "estado_de_apertura_del_proceso",
  "tipo_de_contrato",
  "subtipo_de_contrato",
  "categorias_adicionales",
  "urlproceso",
  "codigo_entidad",
  "estado_resumen",
] as const;

/** Raw row from dataset p6dx-8zbt */
export type SecopProceso = Partial<Record<Exclude<(typeof PROCESO_FIELDS)[number], "urlproceso">, string>> & {
  urlproceso?: { url: string } | string;
};

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

/** Minimal fields for dashboard (reduces payload ~75%) */
export interface SecopContratoMin {
  id_contrato: string;
  nombre_entidad: string;
  fecha_de_firma: string;
  fecha_de_fin_del_contrato: string;
  valor_del_contrato: string;
  valor_facturado: string;
  valor_pagado: string;
  estado_contrato: string;
  objeto_del_contrato: string;
  proveedor_adjudicado: string;
}

/** Aggregated stats per seccional */
export interface SeccionalStats {
  seccional: string;
  totalContratos: number;
  avanceFinancieroPromedio: number;
  avanceFisicoPromedio: number;
  valorTotal: number;
}

/** Aggregated stats per year+month */
export interface PeriodoStats {
  year: number;
  month: number;
  totalContratos: number;
  avanceFinancieroPromedio: number;
  avanceFisicoPromedio: number;
  valorTotal: number;
}

/** Risk level for a contract */
export type RiesgoLevel = "alto" | "medio" | "normal" | "sin_dato";

export interface RiesgoInfo {
  nivel: RiesgoLevel;
  tiempoTranscurrido: number; // 0-100 %
  rezagoFinanciero: number;   // percentage points behind
  rezagoFisico: number;
  diasRestantes: number;
}

// ─── Internal helpers ─────────────────────────────────────────────────────────

/** Escape a value for use inside a SoQL double-quoted string literal */
function soqlString(value: string): string {
  return `"${value.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;
}

function yearMonthWhere(year: number, month?: number): string {
  let where = `date_extract_y(\`${FECHA_FIELD}\`) = ${Number(year)}`;
  if (month !== undefined) where += ` AND date_extract_m(\`${FECHA_FIELD}\`) = ${Number(month)}`;
  return where;
}

function seccionalWhere(seccional: string): string {
  return `caseless_contains(\`entidad\`, ${soqlString(seccional)})`;
}

async function fetchWithTimeout<T>(url: string): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  const headers: Record<string, string> = { Accept: "application/json" };
  if (SECOP_APP_TOKEN) headers["X-App-Token"] = SECOP_APP_TOKEN;
  try {
    const res = await fetch(url, { headers, signal: controller.signal });
    if (!res.ok) throw new Error(`SECOP HTTP ${res.status}`);
    return res.json() as Promise<T>;
  } finally {
    clearTimeout(timer);
  }
}

/** Run a SoQL query against the SODA v3 endpoint, with retries */
async function fetchQuery<T>(query: string, attempt = 0): Promise<T> {
  const url = new URL(SECOP_BASE);
  url.searchParams.set("query", query);
  try {
    return await fetchWithTimeout<T>(url.toString());
  } catch (err) {
    if (attempt < 2) {
      await new Promise((r) => setTimeout(r, 600 * (attempt + 1)));
      return fetchQuery<T>(query, attempt + 1);
    }
    throw err;
  }
}

async function fetchCount(where: string): Promise<number> {
  const data = await fetchQuery<Array<{ count: string }>>(
    `SELECT count(*) AS count WHERE ${where}`
  );
  return Number(data[0]?.count ?? 0);
}

async function fetchAllParallel(
  where: string,
  select: string,
  onProgress?: (loaded: number, total: number) => void,
  batchSize = 4
): Promise<SecopProceso[]> {
  const total = await fetchCount(where);
  if (total === 0) return [];

  onProgress?.(0, total);

  const offsets: number[] = [];
  for (let offset = 0; offset < total; offset += PAGE_SIZE) {
    offsets.push(offset);
  }

  const results: SecopProceso[] = [];
  let loaded = 0;

  for (let i = 0; i < offsets.length; i += batchSize) {
    const batch = offsets.slice(i, i + batchSize);
    const pages = await Promise.all(
      batch.map((offset) =>
        fetchQuery<SecopProceso[]>(
          `SELECT ${select} WHERE ${where} ORDER BY \`${FECHA_FIELD}\` ASC, \`id_del_proceso\` ASC LIMIT ${PAGE_SIZE} OFFSET ${offset}`
        )
      )
    );
    for (const page of pages) {
      results.push(...page);
      loaded += page.length;
    }
    onProgress?.(Math.min(loaded, total), total);
  }

  return results;
}

// ─── Normalization (p6dx-8zbt → SecopContrato) ───────────────────────────────

const ALL_FIELDS_SELECT = PROCESO_FIELDS.map((f) => `\`${f}\``).join(", ");

/** Compute an end date from a start date plus `duracion` + `unidad_de_duracion` */
function calcularFechaFin(inicio: string | undefined, duracion?: string, unidad?: string): string {
  if (!inicio) return "";
  const start = new Date(inicio);
  const n = parseFloat(duracion || "");
  if (isNaN(start.getTime()) || isNaN(n) || n <= 0) return "";

  const u = (unidad || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
  const end = new Date(start);
  if (u.startsWith("dia")) end.setDate(end.getDate() + Math.round(n));
  else if (u.startsWith("semana")) end.setDate(end.getDate() + Math.round(n * 7));
  else if (u.startsWith("mes")) end.setMonth(end.getMonth() + Math.round(n));
  else if (u.startsWith("ano")) end.setFullYear(end.getFullYear() + Math.round(n));
  else if (u.startsWith("hora")) end.setTime(end.getTime() + n * 3600000);
  else return "";

  return end.toISOString().replace("Z", "");
}

function toContrato(p: SecopProceso): SecopContrato {
  const fechaFirma = p.fecha_adjudicacion || p.fecha_de_publicacion_del || "";
  const url = typeof p.urlproceso === "string" ? p.urlproceso : p.urlproceso?.url;
  const valor = p.valor_total_adjudicacion && parseFloat(p.valor_total_adjudicacion) > 0
    ? p.valor_total_adjudicacion
    : p.precio_base || "";

  return {
    nombre_entidad: p.entidad || "",
    nit_entidad: p.nit_entidad || "",
    departamento: p.departamento_entidad || "",
    ciudad: p.ciudad_entidad || "",
    proceso_de_compra: p.id_del_portafolio || p.id_del_proceso || "",
    id_contrato: p.id_del_proceso || "",
    referencia_del_contrato: p.referencia_del_proceso || "",
    estado_contrato: p.estado_resumen || p.estado_del_procedimiento || "",
    descripcion_del_proceso: p.descripci_n_del_procedimiento || "",
    tipo_de_contrato: p.tipo_de_contrato || "",
    modalidad_de_contratacion: p.modalidad_de_contratacion || "",
    fecha_de_firma: fechaFirma,
    fecha_de_inicio_del_contrato: fechaFirma,
    fecha_de_fin_del_contrato: calcularFechaFin(fechaFirma, p.duracion, p.unidad_de_duracion),
    proveedor_adjudicado: p.nombre_del_proveedor || "",
    documento_proveedor: p.nit_del_proveedor_adjudicado || "",
    valor_del_contrato: valor,
    // El dataset de procesos no reporta ejecución financiera
    valor_facturado: "",
    valor_pagado: "",
    valor_pendiente_de_pago: "",
    valor_pendiente_de_ejecucion: "",
    objeto_del_contrato: p.nombre_del_procedimiento || p.descripci_n_del_procedimiento || "",
    duraci_n_del_contrato: [p.duracion, p.unidad_de_duracion].filter(Boolean).join(" "),
    nombre_supervisor: p.nombre_del_adjudicador || "",
    urlproceso: url ? { url } : undefined,
    dias_adicionados: "",
    ultima_actualizacion: p.fecha_de_ultima_publicaci || "",
  };
}

// ─── Seccional extraction ─────────────────────────────────────────────────────

export function extractSeccional(nombre: string): string {
  const match =
    nombre.match(/Judicial\s+(?:de|del)\s+(.+)$/i) ||
    nombre.match(/DESAJ\s*[-–:]?\s*(?:de\s+)?(.+)$/i);
  if (!match) return nombre.trim().toUpperCase();
  return match[1].trim().replace(/\.$/, "").toUpperCase();
}

// ─── Risk calculation ─────────────────────────────────────────────────────────

export function calcularRiesgo(contrato: SecopContratoMin): RiesgoInfo {
  const today = new Date();
  const start = new Date(contrato.fecha_de_firma);
  const end = new Date(contrato.fecha_de_fin_del_contrato);

  const diasRestantes = isNaN(end.getTime())
    ? 0
    : Math.ceil((end.getTime() - today.getTime()) / 86400000);

  if (isNaN(start.getTime()) || isNaN(end.getTime())) {
    return { nivel: "sin_dato", tiempoTranscurrido: 0, rezagoFinanciero: 0, rezagoFisico: 0, diasRestantes };
  }

  const totalMs = end.getTime() - start.getTime();
  const elapsedMs = today.getTime() - start.getTime();
  const tt = totalMs > 0 ? Math.min(Math.max(elapsedMs / totalMs, 0), 1) : 0;

  const vc = parseFloat(contrato.valor_del_contrato || "0") || 0;
  if (vc === 0) {
    return { nivel: "sin_dato", tiempoTranscurrido: tt * 100, rezagoFinanciero: 0, rezagoFisico: 0, diasRestantes };
  }

  if (!contrato.valor_pagado && !contrato.valor_facturado) {
    return { nivel: "sin_dato", tiempoTranscurrido: tt * 100, rezagoFinanciero: 0, rezagoFisico: 0, diasRestantes };
  }

  const vp = parseFloat(contrato.valor_pagado || "0") || 0;
  const vf = parseFloat(contrato.valor_facturado || "0") || 0;

  const avFin = Math.min(vp / vc, 1);
  const avFis = Math.min(vf / vc, 1);

  const rezFin = tt - avFin;
  const rezFis = tt - avFis;

  let nivel: RiesgoLevel;
  if (rezFin > 0.4 || rezFis > 0.4) nivel = "alto";
  else if (rezFin > 0.2 || rezFis > 0.2) nivel = "medio";
  else nivel = "normal";

  return {
    nivel,
    tiempoTranscurrido: tt * 100,
    rezagoFinanciero: rezFin * 100,
    rezagoFisico: rezFis * 100,
    diasRestantes,
  };
}

// ─── Public API ───────────────────────────────────────────────────────────────

/** Get ALL distinct seccionales (no date filter) */
export async function getAllSecopSeccionales(): Promise<string[]> {
  const data = await fetchQuery<Array<{ entidad: string }>>(
    `SELECT \`entidad\` WHERE ${ENTIDAD_WHERE} GROUP BY \`entidad\` ORDER BY \`entidad\` ASC`
  );
  return [...new Set(data.map((d) => extractSeccional(d.entidad || "")))].sort();
}

/** Get distinct years from the publication date */
export async function getSecopYears(): Promise<number[]> {
  const data = await fetchQuery<Array<{ year: string }>>(
    `SELECT date_extract_y(\`${FECHA_FIELD}\`) AS year WHERE ${ENTIDAD_WHERE} GROUP BY year ORDER BY year DESC`
  );
  return data.map((d) => Number(d.year)).filter((y) => !isNaN(y) && y > 0);
}

/** Get distinct months for a year */
export async function getSecopMonths(year: number): Promise<number[]> {
  const data = await fetchQuery<Array<{ month: string }>>(
    `SELECT date_extract_m(\`${FECHA_FIELD}\`) AS month WHERE ${ENTIDAD_WHERE} AND ${yearMonthWhere(year)} GROUP BY month ORDER BY month ASC`
  );
  return data.map((d) => Number(d.month)).filter((m) => !isNaN(m) && m > 0);
}

/** Get distinct seccionales for a year+month */
export async function getSecopSeccionales(year: number, month: number): Promise<string[]> {
  const data = await fetchQuery<Array<{ entidad: string }>>(
    `SELECT \`entidad\` WHERE ${ENTIDAD_WHERE} AND ${yearMonthWhere(year, month)} GROUP BY \`entidad\` ORDER BY \`entidad\` ASC`
  );
  return [...new Set(data.map((d) => extractSeccional(d.entidad || "")))].sort();
}

/** Get processes list for filters */
export async function getSecopContratos(
  year: number,
  month: number,
  seccional: string
): Promise<Array<{ id_contrato: string; proveedor_adjudicado: string }>> {
  const data = await fetchQuery<SecopProceso[]>(
    `SELECT \`id_del_proceso\`, \`nombre_del_proveedor\` WHERE ${ENTIDAD_WHERE} AND ${yearMonthWhere(year, month)} AND ${seccionalWhere(seccional)} ORDER BY \`id_del_proceso\` ASC LIMIT ${PAGE_SIZE}`
  );
  const seen = new Set<string>();
  return data
    .filter((d) => d.id_del_proceso && !seen.has(d.id_del_proceso) && seen.add(d.id_del_proceso))
    .map((d) => ({
      id_contrato: d.id_del_proceso as string,
      proveedor_adjudicado: d.nombre_del_proveedor || "Sin proveedor",
    }));
}

/** Get full process detail */
export async function getSecopContratoDetail(idContrato: string): Promise<SecopContrato | null> {
  const data = await fetchQuery<SecopProceso[]>(
    `SELECT ${ALL_FIELDS_SELECT} WHERE \`id_del_proceso\` = ${soqlString(idContrato)} LIMIT 1`
  );
  return data[0] ? toContrato(data[0]) : null;
}

/** Get full report for a seccional – uses parallel pagination */
export async function getSecopReporteBySeccional(
  year: number,
  month: number,
  seccional: string,
  onProgress?: (loaded: number, total: number) => void
): Promise<SecopContrato[]> {
  const where = `${ENTIDAD_WHERE} AND ${yearMonthWhere(year, month)} AND ${seccionalWhere(seccional)}`;
  const rows = await fetchAllParallel(where, ALL_FIELDS_SELECT, onProgress);
  return rows.map(toContrato);
}

/**
 * Fetch all ACTIVE processes (computed end date >= today).
 * The dataset has no end-date column, so processes are fetched with a
 * minimal field selection and the end date is computed from `duracion`.
 */
export async function getSecopDashboardVigentes(
  onProgress?: (loaded: number, total: number) => void
): Promise<SecopContratoMin[]> {
  const today = new Date();
  const select = [
    "id_del_proceso",
    "entidad",
    "fecha_de_publicacion_del",
    "fecha_adjudicacion",
    "duracion",
    "unidad_de_duracion",
    "precio_base",
    "valor_total_adjudicacion",
    "estado_resumen",
    "estado_del_procedimiento",
    "nombre_del_procedimiento",
    "nombre_del_proveedor",
  ]
    .map((f) => `\`${f}\``)
    .join(", ");

  const where = ENTIDAD_WHERE;
  const rows = await fetchAllParallel(where, select, onProgress, 5);
  const todayStr = today.toISOString().split("T")[0];

  return rows
    .map(toContrato)
    .filter((c) => c.fecha_de_fin_del_contrato && c.fecha_de_fin_del_contrato.split("T")[0] >= todayStr)
    .map((c) => ({
      id_contrato: c.id_contrato,
      nombre_entidad: c.nombre_entidad,
      fecha_de_firma: c.fecha_de_firma,
      fecha_de_fin_del_contrato: c.fecha_de_fin_del_contrato,
      valor_del_contrato: c.valor_del_contrato,
      valor_facturado: c.valor_facturado,
      valor_pagado: c.valor_pagado,
      estado_contrato: c.estado_contrato,
      objeto_del_contrato: c.objeto_del_contrato,
      proveedor_adjudicado: c.proveedor_adjudicado,
    }));
}

// ─── Aggregation ──────────────────────────────────────────────────────────────

function safePct(numerator: number, denominator: number): number {
  if (!denominator || isNaN(denominator)) return 0;
  return Math.min((numerator / denominator) * 100, 100);
}

/**
 * Aggregate by seccional.
 * If `allSeccionales` is provided, ALL of them appear in the result (even with zero contracts).
 */
export function aggregateBySeccional(
  rows: SecopContratoMin[],
  allSeccionales: string[] = []
): SeccionalStats[] {
  const map = new Map<
    string,
    { totalContratos: number; sumFin: number; sumFis: number; valorTotal: number }
  >();

  // Seed with zero entries for all known seccionales
  for (const sec of allSeccionales) {
    map.set(sec, { totalContratos: 0, sumFin: 0, sumFis: 0, valorTotal: 0 });
  }

  for (const row of rows) {
    const seccional = extractSeccional(row.nombre_entidad);
    const vc = parseFloat(row.valor_del_contrato || "0") || 0;
    const vp = parseFloat(row.valor_pagado || "0") || 0;
    const vf = parseFloat(row.valor_facturado || "0") || 0;

    const entry = map.get(seccional) ?? { totalContratos: 0, sumFin: 0, sumFis: 0, valorTotal: 0 };
    entry.totalContratos += 1;
    entry.sumFin += safePct(vp, vc);
    entry.sumFis += safePct(vf, vc);
    entry.valorTotal += vc;
    map.set(seccional, entry);
  }

  return Array.from(map.entries())
    .map(([seccional, e]) => ({
      seccional,
      totalContratos: e.totalContratos,
      avanceFinancieroPromedio: e.totalContratos ? e.sumFin / e.totalContratos : 0,
      avanceFisicoPromedio: e.totalContratos ? e.sumFis / e.totalContratos : 0,
      valorTotal: e.valorTotal,
    }))
    .sort((a, b) => b.totalContratos - a.totalContratos);
}

/** Aggregate by year × month */
export function aggregateByPeriodo(rows: SecopContratoMin[]): PeriodoStats[] {
  const map = new Map<
    string,
    { year: number; month: number; totalContratos: number; sumFin: number; sumFis: number; valorTotal: number }
  >();

  for (const row of rows) {
    const d = new Date(row.fecha_de_firma);
    if (isNaN(d.getTime())) continue;
    const year = d.getFullYear();
    const month = d.getMonth() + 1;
    const key = `${year}-${String(month).padStart(2, "0")}`;

    const vc = parseFloat(row.valor_del_contrato || "0") || 0;
    const vp = parseFloat(row.valor_pagado || "0") || 0;
    const vf = parseFloat(row.valor_facturado || "0") || 0;

    const entry = map.get(key) ?? { year, month, totalContratos: 0, sumFin: 0, sumFis: 0, valorTotal: 0 };
    entry.totalContratos += 1;
    entry.sumFin += safePct(vp, vc);
    entry.sumFis += safePct(vf, vc);
    entry.valorTotal += vc;
    map.set(key, entry);
  }

  return Array.from(map.values())
    .map((e) => ({
      year: e.year,
      month: e.month,
      totalContratos: e.totalContratos,
      avanceFinancieroPromedio: e.totalContratos ? e.sumFin / e.totalContratos : 0,
      avanceFisicoPromedio: e.totalContratos ? e.sumFis / e.totalContratos : 0,
      valorTotal: e.valorTotal,
    }))
    .sort((a, b) => a.year - b.year || a.month - b.month);
}
