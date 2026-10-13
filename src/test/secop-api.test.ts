import { describe, it, expect, vi, afterEach } from "vitest";
import { getSecopContratoDetail, getSecopYears, extractSeccional } from "@/lib/secop-api";

function mockFetch(body: unknown) {
  const fn = vi.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve(body) });
  vi.stubGlobal("fetch", fn);
  return fn;
}

afterEach(() => vi.unstubAllGlobals());

describe("secop-api (p6dx-8zbt v3)", () => {
  it("queries the v3 endpoint with the entity filter", async () => {
    const fn = mockFetch([{ year: "2025" }, { year: "2024" }]);
    expect(await getSecopYears()).toEqual([2025, 2024]);
    const url = new URL(fn.mock.calls[0][0]);
    expect(url.origin + url.pathname).toBe("https://www.datos.gov.co/api/v3/views/p6dx-8zbt/query.json");
    const query = url.searchParams.get("query")!;
    expect(query).toContain('caseless_contains(`entidad`, "ADMINISTRACIÓN JUDICIAL")');
    expect(query).toContain('caseless_contains(`entidad`, "DESAJ")');
  });

  it("maps a process row to SecopContrato", async () => {
    mockFetch([
      {
        entidad: "DIRECCIÓN EJECUTIVA SECCIONAL DE ADMINISTRACIÓN JUDICIAL DE CALI",
        id_del_proceso: "CO1.REQ.123",
        nombre_del_procedimiento: "Mantenimiento sedes",
        fecha_adjudicacion: "2025-01-15T00:00:00.000",
        duracion: "3",
        unidad_de_duracion: "Mes(es)",
        precio_base: "1000",
        valor_total_adjudicacion: "900",
        nombre_del_proveedor: "Proveedor SAS",
        estado_resumen: "Adjudicado",
        urlproceso: { url: "https://community.secop.gov.co/x" },
      },
    ]);
    const c = await getSecopContratoDetail('CO1.REQ.123"');
    expect(c).toMatchObject({
      id_contrato: "CO1.REQ.123",
      objeto_del_contrato: "Mantenimiento sedes",
      valor_del_contrato: "900",
      proveedor_adjudicado: "Proveedor SAS",
      estado_contrato: "Adjudicado",
      urlproceso: { url: "https://community.secop.gov.co/x" },
    });
    expect(c!.fecha_de_fin_del_contrato.startsWith("2025-04-15")).toBe(true);
    expect(extractSeccional(c!.nombre_entidad)).toBe("CALI");
  });
});
