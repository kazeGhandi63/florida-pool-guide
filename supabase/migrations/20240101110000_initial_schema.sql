-- Create profiles table with pool attendant info
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  pool_attendant TEXT NOT NULL,
  attendant_id TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

-- Create resorts table
CREATE TABLE public.resorts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.resorts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view resorts"
  ON public.resorts FOR SELECT
  USING (true);

-- Create pools table
CREATE TABLE public.pools (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  resort_id UUID REFERENCES public.resorts(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  pool_type TEXT NOT NULL CHECK (pool_type IN ('standard', 'bungalow')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(resort_id, name)
);

ALTER TABLE public.pools ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view pools"
  ON public.pools FOR SELECT
  USING (true);

-- Create daily reads table
CREATE TABLE public.daily_reads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pool_id UUID REFERENCES public.pools(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  chlorine DECIMAL,
  ph DECIMAL,
  temperature DECIMAL,
  flow DECIMAL,
  influent DECIMAL,
  effluent DECIMAL,
  read_date DATE DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.daily_reads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view all daily reads"
  ON public.daily_reads FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can insert their own reads"
  ON public.daily_reads FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own reads"
  ON public.daily_reads FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

-- Create weekly reads table
CREATE TABLE public.weekly_reads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pool_id UUID REFERENCES public.pools(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  tds DECIMAL,
  alkalinity DECIMAL,
  calcium_hardness DECIMAL,
  saturation_index DECIMAL,
  read_date DATE DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.weekly_reads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view all weekly reads"
  ON public.weekly_reads FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can insert their own weekly reads"
  ON public.weekly_reads FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own weekly reads"
  ON public.weekly_reads FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

-- Insert resort data
INSERT INTO public.resorts (name) VALUES
  ('Grand Floridian Resort'),
  ('Contemporary Resort'),
  ('BLT'),
  ('Polynesian Resort'),
  ('Polynesian Island Tower'),
  ('Polynesian Bungalows');

-- Insert pool data for Grand Floridian Resort
INSERT INTO public.pools (resort_id, name, pool_type)
SELECT id, 'Court Yard Pool', 'standard' FROM public.resorts WHERE name = 'Grand Floridian Resort'
UNION ALL
SELECT id, 'Court Yard Spa', 'standard' FROM public.resorts WHERE name = 'Grand Floridian Resort'
UNION ALL
SELECT id, 'Beach Pool', 'standard' FROM public.resorts WHERE name = 'Grand Floridian Resort'
UNION ALL
SELECT id, 'APA', 'standard' FROM public.resorts WHERE name = 'Grand Floridian Resort'
UNION ALL
SELECT id, 'Men Spa', 'standard' FROM public.resorts WHERE name = 'Grand Floridian Resort'
UNION ALL
SELECT id, 'Women Spa', 'standard' FROM public.resorts WHERE name = 'Grand Floridian Resort';

-- Insert pool data for Contemporary Resort
INSERT INTO public.pools (resort_id, name, pool_type)
SELECT id, 'CT Main Pool', 'standard' FROM public.resorts WHERE name = 'Contemporary Resort'
UNION ALL
SELECT id, 'Leisure Pool', 'standard' FROM public.resorts WHERE name = 'Contemporary Resort'
UNION ALL
SELECT id, 'Pool Spa', 'standard' FROM public.resorts WHERE name = 'Contemporary Resort'
UNION ALL
SELECT id, 'Slide Spa', 'standard' FROM public.resorts WHERE name = 'Contemporary Resort';

-- Insert pool data for BLT
INSERT INTO public.pools (resort_id, name, pool_type)
SELECT id, 'BLT Pool', 'standard' FROM public.resorts WHERE name = 'BLT'
UNION ALL
SELECT id, 'BLT Spa', 'standard' FROM public.resorts WHERE name = 'BLT'
UNION ALL
SELECT id, 'BLT IWF', 'standard' FROM public.resorts WHERE name = 'BLT';

-- Insert pool data for Polynesian Resort
INSERT INTO public.pools (resort_id, name, pool_type)
SELECT id, 'Lava Pool', 'standard' FROM public.resorts WHERE name = 'Polynesian Resort'
UNION ALL
SELECT id, 'Lava Spa', 'standard' FROM public.resorts WHERE name = 'Polynesian Resort'
UNION ALL
SELECT id, 'Tiki APA', 'standard' FROM public.resorts WHERE name = 'Polynesian Resort'
UNION ALL
SELECT id, 'Oasis Pool', 'standard' FROM public.resorts WHERE name = 'Polynesian Resort'
UNION ALL
SELECT id, 'Oasis Spa', 'standard' FROM public.resorts WHERE name = 'Polynesian Resort';

-- Insert pool data for Polynesian Island Tower
INSERT INTO public.pools (resort_id, name, pool_type)
SELECT id, 'Cove Pool', 'standard' FROM public.resorts WHERE name = 'Polynesian Island Tower'
UNION ALL
SELECT id, 'Cove Spa', 'standard' FROM public.resorts WHERE name = 'Polynesian Island Tower'
UNION ALL
SELECT id, 'Moana APA', 'standard' FROM public.resorts WHERE name = 'Polynesian Island Tower';

-- Insert pool data for Polynesian Bungalows (1-20)
INSERT INTO public.pools (resort_id, name, pool_type)
SELECT r.id, 'Bungalow ' || n, 'bungalow'
FROM public.resorts r
CROSS JOIN generate_series(1, 20) AS n
WHERE r.name = 'Polynesian Bungalows';

-- Trigger to create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, pool_attendant, attendant_id)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'pool_attendant', 'Pool Attendant'),
    COALESCE(NEW.raw_user_meta_data->>'attendant_id', '')
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();