-- Add missing city and state columns to company_profiles and driver_profiles
-- These are required for Stripe checkout validation

ALTER TABLE public.company_profiles
ADD COLUMN IF NOT EXISTS city TEXT,
ADD COLUMN IF NOT EXISTS state TEXT;

ALTER TABLE public.driver_profiles
ADD COLUMN IF NOT EXISTS city TEXT,
ADD COLUMN IF NOT EXISTS state TEXT;

-- Add indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_company_profiles_state_city 
  ON public.company_profiles(state, city);

CREATE INDEX IF NOT EXISTS idx_driver_profiles_state_city 
  ON public.driver_profiles(state, city);
