-- Vendor self attestation: operations, AI technical, data handling, AI governance, deployment questions
ALTER TABLE public.vendor_self_attestations
  ADD COLUMN IF NOT EXISTS production_model_monitoring varchar(50),
  ADD COLUMN IF NOT EXISTS critical_incident_response_target varchar(30),
  ADD COLUMN IF NOT EXISTS critical_incident_resolution_target varchar(30),
  ADD COLUMN IF NOT EXISTS ir_plan_test_frequency varchar(30),
  ADD COLUMN IF NOT EXISTS incident_customer_communication varchar(30),
  ADD COLUMN IF NOT EXISTS support_coverage varchar(40),
  ADD COLUMN IF NOT EXISTS account_management varchar(40),
  ADD COLUMN IF NOT EXISTS versions_models boolean,
  ADD COLUMN IF NOT EXISTS model_versioning_method varchar(50),
  ADD COLUMN IF NOT EXISTS privacy_programme_scope varchar(50),
  ADD COLUMN IF NOT EXISTS typical_data_volume varchar(30),
  ADD COLUMN IF NOT EXISTS ai_ethics_governance_maturity varchar(50),
  ADD COLUMN IF NOT EXISTS is_multi_tenant boolean,
  ADD COLUMN IF NOT EXISTS tenant_isolation_model varchar(50),
  ADD COLUMN IF NOT EXISTS deployment_customization varchar(40),
  ADD COLUMN IF NOT EXISTS integration_complexity varchar(40);
