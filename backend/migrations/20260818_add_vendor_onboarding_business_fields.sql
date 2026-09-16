-- Vendor onboarding: general business questions + verification of claims
ALTER TABLE public.vendor_onboarding
  ADD COLUMN IF NOT EXISTS funding_status varchar(50),
  ADD COLUMN IF NOT EXISTS financial_position varchar(50),
  ADD COLUMN IF NOT EXISTS enterprise_customers integer,
  ADD COLUMN IF NOT EXISTS customer_retention_rate numeric(5,2),
  ADD COLUMN IF NOT EXISTS trust_centre_url varchar(500),
  ADD COLUMN IF NOT EXISTS security_incidents jsonb NOT NULL DEFAULT '[]'::jsonb;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'vendor_onboarding_funding_status_check'
  ) THEN
    ALTER TABLE public.vendor_onboarding
      ADD CONSTRAINT vendor_onboarding_funding_status_check
      CHECK (
        funding_status IS NULL OR funding_status IN (
          'publicly_traded',
          'series_d_plus',
          'series_b_c',
          'series_a',
          'seed_angel',
          'bootstrapped'
        )
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'vendor_onboarding_financial_position_check'
  ) THEN
    ALTER TABLE public.vendor_onboarding
      ADD CONSTRAINT vendor_onboarding_financial_position_check
      CHECK (
        financial_position IS NULL OR financial_position IN (
          'profitable_3_years',
          'profitable_1_year',
          'break_even',
          'funded_runway_2_years',
          'funded_runway_1_year',
          'uncertain'
        )
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'vendor_onboarding_customer_retention_rate_check'
  ) THEN
    ALTER TABLE public.vendor_onboarding
      ADD CONSTRAINT vendor_onboarding_customer_retention_rate_check
      CHECK (
        customer_retention_rate IS NULL
        OR (customer_retention_rate >= 0 AND customer_retention_rate <= 100)
      );
  END IF;
END $$;
