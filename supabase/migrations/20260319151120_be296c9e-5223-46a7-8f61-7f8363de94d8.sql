
CREATE TABLE public.contratos_seguimiento (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  id_contrato TEXT NOT NULL UNIQUE,
  critico TEXT DEFAULT 'NO',
  tipo_riesgo TEXT,
  situacion TEXT,
  modif_si_no TEXT DEFAULT 'NO',
  fecha_modif DATE,
  tipo_tramite TEXT,
  detalle_modif TEXT,
  adicion_si_no TEXT DEFAULT 'NO',
  valor_adicion NUMERIC,
  fecha_adicion DATE,
  justificacion_adicion TEXT,
  observaciones TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.contratos_seguimiento ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read access" ON public.contratos_seguimiento FOR SELECT TO public USING (true);
CREATE POLICY "Allow public insert access" ON public.contratos_seguimiento FOR INSERT TO public WITH CHECK (true);
CREATE POLICY "Allow public update access" ON public.contratos_seguimiento FOR UPDATE TO public USING (true);

CREATE TRIGGER update_contratos_seguimiento_updated_at
  BEFORE UPDATE ON public.contratos_seguimiento
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
