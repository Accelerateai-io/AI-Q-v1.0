-- Vendor COTS field spec v2: widen outcomes, add desk-research / product-view columns.
ALTER TABLE public.cots_vendor_assessments
  ALTER COLUMN expected_outcomes TYPE text;

ALTER TABLE public.cots_vendor_assessments
  ADD COLUMN IF NOT EXISTS customer_employee_count varchar(20),
  ADD COLUMN IF NOT EXISTS customer_eng_headcount varchar(20),
  ADD COLUMN IF NOT EXISTS customer_annual_revenue varchar(20),
  ADD COLUMN IF NOT EXISTS customer_ownership varchar(30),
  ADD COLUMN IF NOT EXISTS customer_hq_country varchar(60),
  ADD COLUMN IF NOT EXISTS customer_operating_regions jsonb,
  ADD COLUMN IF NOT EXISTS customer_certifications jsonb,
  ADD COLUMN IF NOT EXISTS customer_regulators jsonb,
  ADD COLUMN IF NOT EXISTS customer_public_incident varchar(30),
  ADD COLUMN IF NOT EXISTS customer_cloud_provider varchar(30),
  ADD COLUMN IF NOT EXISTS customer_identity_provider varchar(30),
  ADD COLUMN IF NOT EXISTS customer_scm_platform varchar(30),
  ADD COLUMN IF NOT EXISTS customer_incumbent_ai_tooling jsonb,
  ADD COLUMN IF NOT EXISTS likely_integration_systems jsonb,
  ADD COLUMN IF NOT EXISTS customer_ai_maturity_evidence jsonb,
  ADD COLUMN IF NOT EXISTS customer_ai_leadership varchar(40),
  ADD COLUMN IF NOT EXISTS customer_public_ai_policy varchar(40),
  ADD COLUMN IF NOT EXISTS opportunity_type varchar(40),
  ADD COLUMN IF NOT EXISTS target_user_function jsonb,
  ADD COLUMN IF NOT EXISTS estimated_users_in_scope varchar(20),
  ADD COLUMN IF NOT EXISTS competitors jsonb,
  ADD COLUMN IF NOT EXISTS build_vs_buy_signal varchar(80),
  ADD COLUMN IF NOT EXISTS key_advantages_rows jsonb,
  ADD COLUMN IF NOT EXISTS information_basis jsonb,
  ADD COLUMN IF NOT EXISTS answer_confidence varchar(80),
  ADD COLUMN IF NOT EXISTS research_date date;
