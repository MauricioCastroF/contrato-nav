import { useState, useEffect } from "react";
import { FileText, Calendar, DollarSign, Loader2, Save, X, AlertTriangle, Settings, PlusCircle, MessageSquare, ExternalLink } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { upsertLocalTracking, getLocalTracking } from "@/lib/supabase-queries";
import type { SecopContrato } from "@/lib/secop-api";

function formatCurrency(value: string | number | null) {
  if (value == null) return "$0";
  const num = typeof value === "string" ? Number(value) : value;
  if (isNaN(num)) return "$0";
  return new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", minimumFractionDigits: 0 }).format(num);
}

function formatDate(d: string | null) {
  if (!d) return "N/A";
  const date = new Date(d);
  if (isNaN(date.getTime())) return "N/A";
  return date.toLocaleDateString("es-CO", { day: "2-digit", month: "2-digit", year: "numeric" });
}

function estadoBadgeClass(estado: string | null) {
  if (!estado) return "bg-muted text-muted-foreground";
  const lower = estado.toLowerCase();
  if (lower.includes("ejecución") || lower.includes("ejecucion")) return "bg-success text-success-foreground";
  if (lower.includes("modificado")) return "bg-warning text-warning-foreground";
  if (lower.includes("terminado") || lower.includes("liquidado")) return "bg-muted text-muted-foreground";
  return "bg-info text-info-foreground";
}

interface ContractDetailProps {
  contrato: SecopContrato | null;
  isLoading: boolean;
  onSaved?: () => void;
}

export function ContractDetail({ contrato, isLoading, onSaved }: ContractDetailProps) {
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  const [loadingTracking, setLoadingTracking] = useState(false);

  const [critico, setCritico] = useState("NO");
  const [tipoRiesgo, setTipoRiesgo] = useState("");
  const [situacion, setSituacion] = useState("");
  const [modifSiNo, setModifSiNo] = useState("NO");
  const [fechaModif, setFechaModif] = useState("");
  const [tipoTramite, setTipoTramite] = useState("");
  const [detalleModif, setDetalleModif] = useState("");
  const [adicionSiNo, setAdicionSiNo] = useState("NO");
  const [valorAdicion, setValorAdicion] = useState("");
  const [fechaAdicion, setFechaAdicion] = useState("");
  const [justificacionAdicion, setJustificacionAdicion] = useState("");
  const [observaciones, setObservaciones] = useState("");

  // Load local tracking data when contract changes
  useEffect(() => {
    if (!contrato) return;
    setLoadingTracking(true);
    getLocalTracking(contrato.id_contrato)
      .then((tracking) => {
        if (tracking) {
          setCritico(tracking.critico || "NO");
          setTipoRiesgo(tracking.tipo_riesgo || "");
          setSituacion(tracking.situacion || "");
          setModifSiNo(tracking.modif_si_no || "NO");
          setFechaModif(tracking.fecha_modif || "");
          setTipoTramite(tracking.tipo_tramite || "");
          setDetalleModif(tracking.detalle_modif || "");
          setAdicionSiNo(tracking.adicion_si_no || "NO");
          setValorAdicion(tracking.valor_adicion ? String(tracking.valor_adicion) : "");
          setFechaAdicion(tracking.fecha_adicion || "");
          setJustificacionAdicion(tracking.justificacion_adicion || "");
          setObservaciones(tracking.observaciones || "");
        } else {
          // Reset to defaults
          setCritico("NO"); setTipoRiesgo(""); setSituacion("");
          setModifSiNo("NO"); setFechaModif(""); setTipoTramite("");
          setDetalleModif(""); setAdicionSiNo("NO"); setValorAdicion("");
          setFechaAdicion(""); setJustificacionAdicion(""); setObservaciones("");
        }
      })
      .catch(() => {
        toast({ title: "Aviso", description: "No se pudieron cargar los datos de seguimiento local.", variant: "destructive" });
      })
      .finally(() => setLoadingTracking(false));
  }, [contrato]);

  const handleDiscard = () => {
    if (contrato) {
      // Re-load from DB
      getLocalTracking(contrato.id_contrato).then((tracking) => {
        setCritico(tracking?.critico || "NO");
        setTipoRiesgo(tracking?.tipo_riesgo || "");
        setSituacion(tracking?.situacion || "");
        setModifSiNo(tracking?.modif_si_no || "NO");
        setFechaModif(tracking?.fecha_modif || "");
        setTipoTramite(tracking?.tipo_tramite || "");
        setDetalleModif(tracking?.detalle_modif || "");
        setAdicionSiNo(tracking?.adicion_si_no || "NO");
        setValorAdicion(tracking?.valor_adicion ? String(tracking.valor_adicion) : "");
        setFechaAdicion(tracking?.fecha_adicion || "");
        setJustificacionAdicion(tracking?.justificacion_adicion || "");
        setObservaciones(tracking?.observaciones || "");
      });
    }
  };

  const handleSave = async () => {
    if (!contrato) return;
    setSaving(true);
    try {
      await upsertLocalTracking(contrato.id_contrato, {
        critico,
        tipo_riesgo: tipoRiesgo || null,
        situacion: situacion || null,
        modif_si_no: modifSiNo,
        fecha_modif: fechaModif || null,
        tipo_tramite: tipoTramite || null,
        detalle_modif: detalleModif || null,
        adicion_si_no: adicionSiNo,
        valor_adicion: valorAdicion ? Number(valorAdicion) : null,
        fecha_adicion: fechaAdicion || null,
        justificacion_adicion: justificacionAdicion || null,
        observaciones: observaciones || null,
      });
      toast({ title: "✅ Cambios guardados", description: "Los datos de seguimiento se actualizaron correctamente." });
      onSaved?.();
    } catch {
      toast({ title: "Error", description: "No se pudieron guardar los cambios. Intente de nuevo.", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  if (isLoading || loadingTracking) {
    return (
      <div className="space-y-4 p-6 animate-fade-in">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-4 w-48" />
        <div className="grid gap-4 md:grid-cols-2">
          <Skeleton className="h-48" />
          <Skeleton className="h-48" />
        </div>
      </div>
    );
  }

  if (!contrato) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-4 p-12 text-center">
        <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-muted">
          <FileText className="h-10 w-10 text-muted-foreground" />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-foreground">Seleccione un contrato</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Use los filtros del panel lateral para buscar y cargar los detalles de un contrato desde SECOP II
          </p>
        </div>
      </div>
    );
  }

  const urlProceso = contrato.urlproceso?.url;

  return (
    <div className="flex flex-1 flex-col">
      <div className="flex-1 overflow-y-auto">
        {/* Contract Header - Data from SECOP */}
        <div className="border-b border-border bg-card p-6 animate-fade-in">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <Badge className={estadoBadgeClass(contrato.estado_contrato)}>
                  {contrato.estado_contrato || "Sin estado"}
                </Badge>
                <Badge variant="outline" className="text-xs">
                  {contrato.tipo_de_contrato || "N/A"}
                </Badge>
                <Badge variant="outline" className="text-xs border-secondary/50 text-secondary">
                  {contrato.modalidad_de_contratacion || "N/A"}
                </Badge>
              </div>
              <h2 className="text-lg font-bold text-foreground leading-tight mt-2">
                {contrato.proveedor_adjudicado || "Sin proveedor"}
              </h2>
              <p className="text-xs text-muted-foreground mt-1 font-mono">{contrato.id_contrato}</p>
              <p className="text-sm text-muted-foreground mt-2 line-clamp-3">{contrato.objeto_del_contrato}</p>
              <div className="flex flex-wrap gap-3 mt-3 text-xs text-muted-foreground">
                <span>Supervisor: {contrato.nombre_supervisor || "N/A"}</span>
                <span>Duración: {contrato.duraci_n_del_contrato || "N/A"}</span>
              </div>
              {urlProceso && (
                <a href={urlProceso} target="_blank" rel="noopener noreferrer"
                  className="mt-2 inline-flex items-center gap-1 text-xs text-primary hover:underline">
                  <ExternalLink className="h-3 w-3" /> Ver en SECOP II
                </a>
              )}
            </div>
            <div className="flex flex-col items-end gap-1 text-right shrink-0">
              <div className="flex items-center gap-1 text-muted-foreground">
                <DollarSign className="h-4 w-4" />
                <span className="text-xs">Valor Total</span>
              </div>
              <span className="text-xl font-bold text-foreground">{formatCurrency(contrato.valor_del_contrato)}</span>
              <div className="text-xs text-muted-foreground space-y-0.5 mt-1">
                <p>Pagado: {formatCurrency(contrato.valor_pagado)}</p>
                <p>Pendiente: {formatCurrency(contrato.valor_pendiente_de_ejecucion)}</p>
              </div>
              <div className="flex items-center gap-1 text-muted-foreground mt-2">
                <Calendar className="h-3 w-3" />
                <span className="text-xs">Inicio: {formatDate(contrato.fecha_de_inicio_del_contrato)}</span>
              </div>
              <div className="flex items-center gap-1 text-muted-foreground">
                <Calendar className="h-3 w-3" />
                <span className="text-xs">Fin: {formatDate(contrato.fecha_de_fin_del_contrato)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Editable Form Cards - Local tracking */}
        <div className="space-y-4 p-6">
          {/* Situación Crítica */}
          <Card className="animate-fade-in border-border shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-sm font-semibold">
                <AlertTriangle className="h-4 w-4 text-warning" />
                Reporte de Situación Crítica
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label className="text-xs">¿Es crítico?</Label>
                  <Select value={critico} onValueChange={setCritico}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="SI">SI</SelectItem>
                      <SelectItem value="NO">NO</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Tipo de Riesgo</Label>
                  <Select value={tipoRiesgo} onValueChange={setTipoRiesgo} disabled={critico === "NO"}>
                    <SelectTrigger><SelectValue placeholder="Seleccionar" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Financiero">Financiero</SelectItem>
                      <SelectItem value="Operativo">Operativo</SelectItem>
                      <SelectItem value="Legal">Legal</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Descripción de la situación</Label>
                <Textarea
                  value={situacion}
                  onChange={(e) => setSituacion(e.target.value)}
                  placeholder="Describa la situación..."
                  rows={3}
                  disabled={critico === "NO"}
                />
              </div>
            </CardContent>
          </Card>

          {/* Modificaciones */}
          <Card className="animate-fade-in border-border shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-sm font-semibold">
                <Settings className="h-4 w-4 text-info" />
                Modificaciones Contractuales
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label className="text-xs">¿Tiene modificaciones?</Label>
                  <Select value={modifSiNo} onValueChange={setModifSiNo}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="SI">SI</SelectItem>
                      <SelectItem value="NO">NO</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Fecha de Modificación</Label>
                  <Input type="date" value={fechaModif} onChange={(e) => setFechaModif(e.target.value)} disabled={modifSiNo === "NO"} />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Tipo de Trámite</Label>
                <Select value={tipoTramite} onValueChange={setTipoTramite} disabled={modifSiNo === "NO"}>
                  <SelectTrigger><SelectValue placeholder="Seleccionar" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Prórroga">Prórroga</SelectItem>
                    <SelectItem value="Suspensión">Suspensión</SelectItem>
                    <SelectItem value="Cesión">Cesión</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Detalle de la modificación</Label>
                <Textarea
                  value={detalleModif}
                  onChange={(e) => setDetalleModif(e.target.value)}
                  placeholder="Describa la modificación..."
                  rows={3}
                  disabled={modifSiNo === "NO"}
                />
              </div>
            </CardContent>
          </Card>

          {/* Adiciones */}
          <Card className="animate-fade-in border-border shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-sm font-semibold">
                <PlusCircle className="h-4 w-4 text-success" />
                Adiciones Presupuestales
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label className="text-xs">¿Tiene adiciones?</Label>
                  <Select value={adicionSiNo} onValueChange={setAdicionSiNo}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="SI">SI</SelectItem>
                      <SelectItem value="NO">NO</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Valor de la Adición</Label>
                  <Input
                    type="number"
                    value={valorAdicion}
                    onChange={(e) => setValorAdicion(e.target.value)}
                    placeholder="$0"
                    disabled={adicionSiNo === "NO"}
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Fecha de la Adición</Label>
                <Input type="date" value={fechaAdicion} onChange={(e) => setFechaAdicion(e.target.value)} disabled={adicionSiNo === "NO"} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Justificación</Label>
                <Textarea
                  value={justificacionAdicion}
                  onChange={(e) => setJustificacionAdicion(e.target.value)}
                  placeholder="Justifique la adición presupuestal..."
                  rows={3}
                  disabled={adicionSiNo === "NO"}
                />
              </div>
            </CardContent>
          </Card>

          {/* Observaciones */}
          <Card className="animate-fade-in border-border shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-sm font-semibold">
                <MessageSquare className="h-4 w-4 text-muted-foreground" />
                Observaciones Generales
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Textarea
                value={observaciones}
                onChange={(e) => setObservaciones(e.target.value)}
                placeholder="Escriba sus observaciones generales sobre este contrato..."
                rows={4}
              />
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Sticky Footer */}
      <div className="sticky bottom-0 border-t border-border bg-card px-6 py-3 flex items-center justify-end gap-3 shadow-[0_-2px_10px_-3px_rgba(0,0,0,0.05)]">
        <Button variant="ghost" onClick={handleDiscard} className="gap-1">
          <X className="h-4 w-4" />
          Descartar Cambios
        </Button>
        <Button onClick={handleSave} disabled={saving} className="gap-1">
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Guardar Cambios
        </Button>
      </div>
    </div>
  );
}
