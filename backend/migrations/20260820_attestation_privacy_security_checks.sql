-- Vendor self attestation: CHECK constraints for privacy / security attestation fields
UPDATE public.vendor_self_attestations
SET tls_in_transit = CASE
  WHEN tls_in_transit IS NULL OR btrim(tls_in_transit) = '' THEN NULL
  WHEN tls_in_transit IN ('TLS 1.2', '1.2+', '1.3', 'Other') THEN tls_in_transit
  WHEN lower(replace(tls_in_transit, ' ', '')) LIKE '%1.2+%' THEN '1.2+'
  WHEN lower(replace(tls_in_transit, ' ', '')) LIKE '%1.3%' THEN '1.3'
  WHEN lower(replace(tls_in_transit, ' ', '')) LIKE '%1.2%' THEN 'TLS 1.2'
  ELSE 'Other'
END
WHERE tls_in_transit IS NOT NULL
  AND tls_in_transit NOT IN ('TLS 1.2', '1.2+', '1.3', 'Other');

UPDATE public.vendor_self_attestations
SET controller_or_processor = NULL
WHERE controller_or_processor IS NOT NULL
  AND controller_or_processor NOT IN ('controller', 'processor', 'both');

UPDATE public.vendor_self_attestations
SET independent_pen_test_frequency = NULL
WHERE independent_pen_test_frequency IS NOT NULL
  AND independent_pen_test_frequency NOT IN (
    'continuous',
    'quarterly',
    'annually',
    'ad_hoc',
    'none'
  );

UPDATE public.vendor_self_attestations
SET dpa_available = NULL
WHERE dpa_available IS NOT NULL
  AND dpa_available NOT IN ('publicly_available', 'on_request', 'none');

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'vendor_self_attestations_tls_in_transit_check'
  ) THEN
    ALTER TABLE public.vendor_self_attestations
      ADD CONSTRAINT vendor_self_attestations_tls_in_transit_check
      CHECK (
        tls_in_transit IS NULL OR tls_in_transit IN ('TLS 1.2', '1.2+', '1.3', 'Other')
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'vendor_self_attestations_controller_or_processor_check'
  ) THEN
    ALTER TABLE public.vendor_self_attestations
      ADD CONSTRAINT vendor_self_attestations_controller_or_processor_check
      CHECK (
        controller_or_processor IS NULL
        OR controller_or_processor IN ('controller', 'processor', 'both')
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'vendor_self_attestations_independent_pen_test_frequency_check'
  ) THEN
    ALTER TABLE public.vendor_self_attestations
      ADD CONSTRAINT vendor_self_attestations_independent_pen_test_frequency_check
      CHECK (
        independent_pen_test_frequency IS NULL
        OR independent_pen_test_frequency IN (
          'continuous',
          'quarterly',
          'annually',
          'ad_hoc',
          'none'
        )
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'vendor_self_attestations_dpa_available_check'
  ) THEN
    ALTER TABLE public.vendor_self_attestations
      ADD CONSTRAINT vendor_self_attestations_dpa_available_check
      CHECK (
        dpa_available IS NULL
        OR dpa_available IN ('publicly_available', 'on_request', 'none')
      );
  END IF;
END $$;
