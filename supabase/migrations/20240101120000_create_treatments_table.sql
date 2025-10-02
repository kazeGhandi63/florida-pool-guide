-- Create the treatments table
CREATE TABLE IF NOT EXISTS public.treatments (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    pool_id uuid NOT NULL,
    user_id uuid NOT NULL,
    bicarb_cups_added numeric,
    calcium_cups_added numeric,
    treatment_date date NOT NULL DEFAULT CURRENT_DATE,
    CONSTRAINT treatments_pkey PRIMARY KEY (id),
    CONSTRAINT treatments_pool_id_fkey FOREIGN KEY (pool_id) REFERENCES public.pools(id) ON DELETE CASCADE,
    CONSTRAINT treatments_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE
);

-- Enable Row Level Security
ALTER TABLE public.treatments ENABLE ROW LEVEL SECURITY;

-- Create policies for treatments table
-- Allow authenticated users to insert their own treatments
CREATE POLICY "Allow authenticated users to insert their own treatments"
ON public.treatments
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Allow users to view their own treatments
CREATE POLICY "Allow users to view their own treatments"
ON public.treatments
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Allow users to update their own treatments
CREATE POLICY "Allow users to update their own treatments"
ON public.treatments
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Allow users to delete their own treatments
CREATE POLICY "Allow users to delete their own treatments"
ON public.treatments
FOR DELETE
TO authenticated
USING (auth.uid() = user_id);