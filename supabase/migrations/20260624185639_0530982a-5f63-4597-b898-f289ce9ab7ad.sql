
CREATE SEQUENCE IF NOT EXISTS public.booking_number_seq START 1;

CREATE TABLE public.bookings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  booking_number TEXT NOT NULL UNIQUE DEFAULT ('G' || lpad(nextval('public.booking_number_seq')::text, 3, '0')),
  customer_name TEXT NOT NULL,
  mobile_number TEXT NOT NULL,
  total_amount NUMERIC(10,2) NOT NULL DEFAULT 0,
  advance_amount NUMERIC(10,2) NOT NULL DEFAULT 0,
  pending_amount NUMERIC(10,2) GENERATED ALWAYS AS (total_amount - advance_amount) STORED,
  murti_photo_url TEXT,
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'Pending' CHECK (status IN ('Pending','Delivered')),
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  delivered_at TIMESTAMPTZ
);

CREATE INDEX bookings_mobile_idx ON public.bookings (mobile_number);
CREATE INDEX bookings_name_idx ON public.bookings (lower(customer_name));
CREATE INDEX bookings_status_idx ON public.bookings (status);
CREATE INDEX bookings_created_idx ON public.bookings (created_at DESC);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.bookings TO authenticated;
GRANT ALL ON public.bookings TO service_role;
GRANT USAGE ON SEQUENCE public.booking_number_seq TO authenticated;

ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff can view all bookings" ON public.bookings FOR SELECT TO authenticated USING (true);
CREATE POLICY "Staff can insert bookings" ON public.bookings FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Staff can update bookings" ON public.bookings FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Staff can delete bookings" ON public.bookings FOR DELETE TO authenticated USING (true);

CREATE OR REPLACE FUNCTION public.set_updated_at() RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER bookings_set_updated_at BEFORE UPDATE ON public.bookings
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
