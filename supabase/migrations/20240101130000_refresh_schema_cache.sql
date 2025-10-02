-- This migration is intended to force a schema cache refresh in Supabase/PostgREST
-- by adding comments to the columns that were previously missing from the cache.
-- This is a non-structural change that modifies database metadata.

COMMENT ON COLUMN public.treatments.bicarb_cups_added IS 'The number of bicarb cups added during treatment.';
COMMENT ON COLUMN public.treatments.calcium_cups_added IS 'The number of calcium cups added during treatment.';