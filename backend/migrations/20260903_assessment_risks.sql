CREATE TABLE IF NOT EXISTS public.risks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  risk_id varchar(50) NOT NULL,
  title varchar(500) NOT NULL,
  domain varchar(100),
  description text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.assessment_risks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  assessment_id uuid NOT NULL,
  risk_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS assessment_risks_assessment_id_idx
  ON public.assessment_risks (assessment_id);
