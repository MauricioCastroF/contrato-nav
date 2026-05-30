const SECOP_BASE = "https://www.datos.gov.co/resource/jbjy-vk9h.json";
const ENTIDAD_WHERE = `upper(nombre_entidad) like '%RAMA JUDICIAL%SECCIONAL%'`;
const PAGE_SIZE = 1000;
const REQUEST_TIMEOUT_MS = 30000;

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

function buildUrl(base: string, params: Record<string, string>): string {
  const url = new URL(base);
  for (const [k, v] of Object.entries(params)) {
    url.searchParams.set(k, v);
  }
  return url.toString();
}

async function fetchWithTimeout<T>(url: string): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      headers: { Accept: "application/json" },
      signal: controller.signal,
    });
    if (!res.ok) throw new Error(`SECOP HTTP ${res.status}`);
    return res.json() as Promise<T>;
  } finally {
    clearTimeout(timer);
  }
}

async function fetchPage<T>(params: Record<string, string>, attempt = 0): Promise<T> {
  const url = buildUrl(SECOP_BASE, params);
  try {
    return await fetchWithTimeout<T>(url);
  } catch (err) {
    if (attempt < 2) {
      await new Promise((r) => setTimeout(r, 600 * (attempt + 1)));
      return fetchPage<T>(params, attempt + 1);
    }
    throw err;
  }
}

async function fetchCount(where: string): Promise<number> {
  const data = await fetchPage<Array<{ count: string }>>({
    $select: "count(*) as count",
    $where: where,
  });
  return Number(data[0]?.count ?? 0);
}

async function fetchAllParallel<T>(
  where: string,
  select: string,
  onProgress?: (loaded: number, total: number) => void,
  batchSize = 4
): Promise<T[]> {
  const total = await fetchCount(where);
  if (total === 0) return [];

  onProgress?.(0, total);

  const offsets: number[] = [];
  for (let offset = 0; offset < total; offset += PAGE_SIZE) {
    offsets.push(offset);
  }

  const results: T[] = [];
  let loaded = 0;

  for (let i = 0; i < offsets.length; i += batchSize) {
    const batch = offsets.slice(i, i + batchSize);
    const pages = await Promise.all(
      batch.map((offset) =>
        fetchPage<T[]>({
          $select: select,
          $where: where,
          $limit: String(PAGE_SIZE),
          $offset: String(offset),
          $order: "fecha_de_firma ASC",
        })
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

// ─── Seccional extraction ─────────────────────────────────────────────────────

export function extractSeccional(nombre: string): string {
  const match = nombre.match(/Judicial\s+de\s+(.+)$/i);
  if (!match) return nombre.trim();
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
  const data = await fetchPage<Array<{ nombre_entidad: string }>>({
    $query: `SELECT nombre_entidad WHERE ${ENTIDAD_WHERE} GROUP BY nombre_entidad ORDER BY nombre_entidad ASC`,
  });
  return [...new Set(data.map((d) => extractSeccional(d.nombre_entidad)))].sort();
}

/** Get distinct years from fecha_de_firma */
export async function getSecopYears(): Promise<number[]> {
  const data = await fetchPage<Array<{ year: string }>>({
    $query: `SELECT date_extract_y(fecha_de_firma) as year WHERE ${ENTIDAD_WHERE} GROUP BY date_extract_y(fecha_de_firma) ORDER BY year DESC`,
  });
  return data.map((d) => Number(d.year)).filter((y) => !isNaN(y));
}

/** Get distinct months for a year */
export async function getSecopMonths(year: number): Promise<number[]> {
  const data = await fetchPage<Array<{ month: string }>>({
    $query: `SELECT date_extract_m(fecha_de_firma) as month WHERE ${ENTIDAD_WHERE} AND date_extract_y(fecha_de_firma) = ${year} GROUP BY date_extract_m(fecha_de_firma) ORDER BY month ASC`,
  });
  return data.map((d) => Number(d.month)).filter((m) => !isNaN(m));
}

/** Get distinct seccionales for a year+month */
export async function getSecopSeccionales(year: number, month: number): Promise<string[]> {
  const data = await fetchPage<Array<{ nombre_entidad: string }>>({
    $query: `SELECT nombre_entidad WHERE ${ENTIDAD_WHERE} AND date_extract_y(fecha_de_firma) = ${year} AND date_extract_m(fecha_de_firma) = ${month} GROUP BY nombre_entidad ORDER BY nombre_entidad ASC`,
  });
  return data.map((d) => extractSeccional(d.nombre_entidad));
}

/** Get contracts list for filters */
export async function getSecopContratos(
  year: number,
  month: number,
  seccional: string
): Promise<Array<{ id_contrato: string; proveedor_adjudicado: string }>> {
  const data = await fetchPage<SecopContrato[]>({
    $query: `SELECT id_contrato, proveedor_adjudicado WHERE ${ENTIDAD_WHERE} AND date_extract_y(fecha_de_firma) = ${year} AND date_extract_m(fecha_de_firma) = ${month} AND upper(nombre_entidad) like '%${seccional}%' ORDER BY id_contrato ASC LIMIT 1000`,
  });
  return data.map((d) => ({
    id_contrato: d.id_contrato,
    proveedor_adjudicado: d.proveedor_adjudicado || "Sin proveedor",
  }));
}

/** Get full contract detail */
export async function getSecopContratoDetail(idContrato: string): Promise<SecopContrato | null> {
  const data = await fetchPage<SecopContrato[]>({
    $query: `SELECT * WHERE id_contrato = '${idContrato}' LIMIT 1`,
  });
  return data[0] || null;
}

/** Get full report for a seccional – uses parallel pagination */
export async function getSecopReporteBySeccional(
  year: number,
  month: number,
  seccional: string,
  onProgress?: (loaded: number, total: number) => void
): Promise<SecopContrato[]> {
  const where = `${ENTIDAD_WHERE} AND date_extract_y(fecha_de_firma) = ${year} AND date_extract_m(fecha_de_firma) = ${month} AND upper(nombre_entidad) like '%${seccional}%'`;
  return fetchAllParallel<SecopContrato>(where, "*", onProgress);
}

/**
 * Fetch all ACTIVE contracts (fecha_de_fin >= today).
 * Minimal field selection for maximum speed.
 */
export async function getSecopDashboardVigentes(
  onProgress?: (loaded: number, total: number) => void
): Promise<SecopContratoMin[]> {
  const today = new Date().toISOString().split("T")[0];
  const select = [
    "id_contrato",
    "nombre_entidad",
    "fecha_de_firma",
    "fecha_de_fin_del_contrato",
    "valor_del_contrato",
    "valor_facturado",
    "valor_pagado",
    "estado_contrato",
    "objeto_del_contrato",
    "proveedor_adjudicado",
  ].join(",");

  const where = `${ENTIDAD_WHERE} AND fecha_de_fin_del_contrato >= '${today}T00:00:00.000'`;
  return fetchAllParallel<SecopContratoMin>(where, select, onProgress, 5);
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
