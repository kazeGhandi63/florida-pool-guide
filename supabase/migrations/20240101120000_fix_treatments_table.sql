-- This script ensures the 'treatments' table is correctly defined.

-- First, attempt to create the table if it doesn't exist at all.
-- This provides a baseline and ensures subsequent commands don't fail.
CREATE TABLE IF NOT EXISTS public.treatments (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    pool_id uuid NOT NULL,
    user_id uuid NOT NULL,
    treatment_date date NOT NULL DEFAULT CURRENT_DATE,
    CONSTRAINT treatments_pkey PRIMARY KEY (id)
);

-- Now, add the specific columns that were missing, only if they don't already exist.
-- This is the core fix for the "column does not exist" error.
ALTER TABLE public.treatments
ADD COLUMN IF NOT EXISTS bicarb_cups_added numeric,
ADD COLUMN IF NOT EXISTS calcium_cups_added numeric;

-- Ensure foreign key constraints are in place.
-- We'll drop them first in case they exist but are incorrect, then add the correct ones.
ALTER TABLE public.treatments DROP CONSTRAINT IF EXISTS treatments_pool_id_fkey;
ALTER TABLE public.treatments ADD CONSTRAINT treatments_pool_id_fkey FOREIGN KEY (pool_id) REFERENCES public.pools(id) ON DELETE CASCADE;

ALTER TABLE public.treatments DROP CONSTRAINT IF EXISTS treatments_user_id_fkey;
ALTER TABLE public.treatments ADD CONSTRAINT treatments_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

-- Ensure Row Level Security is enabled and policies are set.
ALTER TABLE public.treatments ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to prevent conflicts, then create the correct ones.
DROP POLICY IF EXISTS "Allow authenticated users to manage treatments" ON public.treatments;
CREATE POLICY "Allow authenticated users to manage treatments" ON public.treatments
FOR ALL
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);