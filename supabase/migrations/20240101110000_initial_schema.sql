-- Drop existing tables in reverse order of dependency to ensure a clean slate
DROP TABLE IF EXISTS public.treatments CASCADE;
DROP TABLE IF EXISTS public.weekly_reads CASCADE;
DROP TABLE IF EXISTS public.daily_reads CASCADE;
DROP TABLE IF EXISTS public.pools CASCADE;
DROP TABLE IF EXISTS public.resorts CASCADE;
DROP TABLE IF EXISTS public.profiles CASCADE;

-- Create profiles table to store user data
CREATE TABLE public.profiles (
    id uuid NOT NULL REFERENCES auth.users ON DELETE CASCADE,
    created_at timestamp with time zone DEFAULT now(),
    pool_attendant text NOT NULL,
    attendant_id text NOT NULL UNIQUE,
    PRIMARY KEY (id)
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public profiles are viewable by everyone." ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Users can insert their own profile." ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "Users can update own profile." ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- Create resorts table
CREATE TABLE public.resorts (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    created_at timestamp with time zone DEFAULT now(),
    name text NOT NULL,
    PRIMARY KEY (id)
);
ALTER TABLE public.resorts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all users to read resorts" ON public.resorts FOR SELECT TO authenticated USING (true);

-- Create pools table
CREATE TABLE public.pools (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    created_at timestamp with time zone DEFAULT now(),
    name text NOT NULL,
    pool_type text NOT NULL,
    resort_id uuid REFERENCES public.resorts(id) ON DELETE CASCADE,
    PRIMARY KEY (id)
);
ALTER TABLE public.pools ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all users to read pools" ON public.pools FOR SELECT TO authenticated USING (true);

-- Create daily_reads table
CREATE TABLE public.daily_reads (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    created_at timestamp with time zone DEFAULT now(),
    read_date date DEFAULT CURRENT_DATE,
    pool_id uuid REFERENCES public.pools(id) ON DELETE CASCADE,
    user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
    chlorine numeric,
    ph numeric,
    temperature numeric,
    flow numeric,
    influent numeric,
    effluent numeric,
    PRIMARY KEY (id),
    UNIQUE (pool_id, read_date)
);
ALTER TABLE public.daily_reads ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow authenticated users to manage daily reads" ON public.daily_reads FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Create weekly_reads table
CREATE TABLE public.weekly_reads (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    created_at timestamp with time zone DEFAULT now(),
    read_date date DEFAULT CURRENT_DATE,
    pool_id uuid REFERENCES public.pools(id) ON DELETE CASCADE,
    user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
    tds numeric,
    alkalinity numeric,
    calcium_hardness numeric,
    saturation_index numeric,
    PRIMARY KEY (id)
);
ALTER TABLE public.weekly_reads ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow authenticated users to manage weekly reads" ON public.weekly_reads FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Create treatments table (CORRECTED AND FINAL VERSION)
CREATE TABLE public.treatments (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    pool_id uuid NOT NULL REFERENCES public.pools(id) ON DELETE CASCADE,
    user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    bicarb_cups_added numeric,
    calcium_cups_added numeric,
    treatment_date date NOT NULL DEFAULT CURRENT_DATE,
    PRIMARY KEY (id)
);
ALTER TABLE public.treatments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow authenticated users to manage treatments" ON public.treatments FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Function to create a profile for a new user upon signup
create function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, pool_attendant, attendant_id)
  values (new.id, new.raw_user_meta_data->>'pool_attendant', new.raw_user_meta_data->>'attendant_id');
  return new;
end;
$$;

-- Trigger that calls the function when a new user is created in auth
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();