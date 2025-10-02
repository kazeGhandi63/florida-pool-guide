-- This is the final, definitive schema for the 'treatments' table.
-- It is idempotent and ensures the table and its columns are correctly defined.

CREATE TABLE IF NOT EXISTS public.treatments (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    pool_id uuid NOT NULL,
    user_id uuid NOT NULL,
    treatment_date date NOT NULL DEFAULT CURRENT_DATE,
    bicarb_cups_added numeric,
    calcium_cups_added numeric,
    CONSTRAINT treatments_pkey PRIMARY KEY (id),
    CONSTRAINT treatments_pool_id_fkey FOREIGN KEY (pool_id) REFERENCES public.pools(id) ON DELETE CASCADE,
    CONSTRAINT treatments_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE
);

-- Ensure Row Level Security is enabled and policies are set.
ALTER TABLE IF EXISTS public.treatments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow authenticated users to manage treatments" ON public.treatments;
CREATE POLICY "Allow authenticated users to manage treatments" ON public.treatments
FOR ALL
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);