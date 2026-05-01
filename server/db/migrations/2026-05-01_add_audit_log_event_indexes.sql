BEGIN;

CREATE INDEX IF NOT EXISTS idx_events_entity_type_occurred
    ON public.events (entity_type, occurred_at DESC)
    WHERE deleted_at IS NULL;

COMMIT;
