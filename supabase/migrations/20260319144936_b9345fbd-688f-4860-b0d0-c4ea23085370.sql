
CREATE TABLE public.contratos_seccionales (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  ano INTEGER NOT NULL,
  mes INTEGER NOT NULL,
  seccional TEXT NOT NULL,
  n_contrato TEXT NOT NULL UNIQUE,
  fecha_de_suscripcion DATE,
  fecha_de_inicio DATE,
  fecha_terminacion DATE,
  modalidad_de_contratacion TEXT,
  tipo_de_contrato TEXT,
  contratista TEXT,
  objeto_del_contrato TEXT,
  valor_del_contrato NUMERIC,
  estado_del_contrato TEXT,
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
  url_proceso TEXT,
  valor_pagado NUMERIC,
  valor_pendiente_ejecucion NUMERIC,
  nombre_supervisor TEXT,
  duracion_contrato TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.contratos_seccionales ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read access" ON public.contratos_seccionales FOR SELECT USING (true);
CREATE POLICY "Allow public update access" ON public.contratos_seccionales FOR UPDATE USING (true);

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_contratos_updated_at
  BEFORE UPDATE ON public.contratos_seccionales
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
