-- AIQ-029: contact name validated to 200 chars; widen vendor/buyer columns.
-- AIQ-031: buyer_onboarding.sector JSON can exceed varchar(500).

ALTER TABLE vendor_onboarding
  ALTER COLUMN primary_contact_name TYPE varchar(200);

ALTER TABLE buyer_onboarding
  ALTER COLUMN primary_contact_name TYPE varchar(200);

ALTER TABLE buyer_onboarding
  ALTER COLUMN sector TYPE text;
