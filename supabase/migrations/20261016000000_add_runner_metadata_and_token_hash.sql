-- Migration: 20261016000000_add_runner_metadata_and_token_hash.sql
-- Decouple runner telemetry from stripe_subscription_id (F-04) and add runner_token_hash (F-01)

ALTER TABLE public.wf_organizations
ADD COLUMN IF NOT EXISTS runner_metadata JSONB DEFAULT '{}'::jsonb,
ADD COLUMN IF NOT EXISTS runner_token_hash TEXT;

-- Safely migrate existing JSON metadata stored in stripe_subscription_id into runner_metadata
UPDATE public.wf_organizations
SET 
  runner_metadata = stripe_subscription_id::jsonb,
  stripe_subscription_id = NULL
WHERE stripe_subscription_id LIKE '{%';

COMMENT ON COLUMN public.wf_organizations.runner_metadata IS 'Runner pairing state, telemetry, heartbeat timestamps, and UI settings (F-04)';
COMMENT ON COLUMN public.wf_organizations.runner_token_hash IS 'SHA-256 hash of the canonical rf_live_ runner authentication token (F-01)';
