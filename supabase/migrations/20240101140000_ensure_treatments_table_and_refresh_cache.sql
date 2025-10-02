-- This is a consolidated migration to definitively fix the treatments table and clear the API schema cache.

-- Step 1: Ensure the table exists with a primary key.
CREATE TABLE IF NOT EXISTS public.treatments (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    pool_id uuid NOT NULL,
    user_id uuid NOT NULL,
    treatment_date date NOT NULL DEFAULT CURRENT_DATE,
    CONSTRAINT treatments_pkey PRIMARY KEY (id)
);

-- Step 2: Add the missing columns if they do not exist.
ALTER TABLE public.treatments
ADD COLUMN IF NOT EXISTS bicarb_cups_added numeric,
ADD COLUMN IF NOT EXISTS calcium_cups_added numeric;

-- Step 3: Re-apply foreign key constraints to ensure they are correct.
ALTER TABLE public.treatments DROP CONSTRAINT IF EXISTS treatments_pool_id_fkey;
ALTER TABLE public.treatments ADD CONSTRAINT treatments_pool_id_fkey FOREIGN KEY (pool_id) REFERENCES public.pools(id) ON DELETE CASCADE;

ALTER TABLE public.treatments DROP CONSTRAINT IF EXISTS treatments_user_id_fkey;
ALTER TABLE public.treatments ADD CONSTRAINT treatments_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

-- Step 4: Ensure Row Level Security is enabled and policies are correct.
ALTER TABLE public.treatments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow authenticated users to manage treatments" ON public.treatments;
CREATE POLICY "Allow authenticated users to manage treatments" ON public.treatments
FOR ALL
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Step 5: Directly notify PostgREST to reload its schema cache. This is the most critical step.
NOTIFY pgrst, 'reload schema';