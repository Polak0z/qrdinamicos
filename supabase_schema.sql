-- Habilitar extensión para UUIDs
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Tabla de Clientes
CREATE TABLE public.clients (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Tabla de QRs Dinámicos
CREATE TABLE public.dynamic_qrs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  target_url TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Tabla de Eventos de Escaneo
CREATE TABLE public.scan_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  qr_id UUID NOT NULL REFERENCES public.dynamic_qrs(id) ON DELETE CASCADE,
  scanned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  user_agent TEXT,
  device_type TEXT
);

-- =========================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- =========================================

-- Habilitar RLS en todas las tablas
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dynamic_qrs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scan_events ENABLE ROW LEVEL SECURITY;

-- Políticas para 'clients'
CREATE POLICY "Allow anonymous read on clients" ON public.clients FOR SELECT USING (true);
CREATE POLICY "Allow anonymous insert on clients" ON public.clients FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow anonymous update on clients" ON public.clients FOR UPDATE USING (true);
CREATE POLICY "Allow anonymous delete on clients" ON public.clients FOR DELETE USING (true);

-- Políticas para 'dynamic_qrs'
CREATE POLICY "Allow anonymous read on dynamic_qrs" ON public.dynamic_qrs FOR SELECT USING (true);
CREATE POLICY "Allow anonymous insert on dynamic_qrs" ON public.dynamic_qrs FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow anonymous update on dynamic_qrs" ON public.dynamic_qrs FOR UPDATE USING (true);
CREATE POLICY "Allow anonymous delete on dynamic_qrs" ON public.dynamic_qrs FOR DELETE USING (true);

-- Políticas para 'scan_events'
CREATE POLICY "Allow anonymous read on scan_events" ON public.scan_events FOR SELECT USING (true);
CREATE POLICY "Allow anonymous insert on scan_events" ON public.scan_events FOR INSERT WITH CHECK (true);
