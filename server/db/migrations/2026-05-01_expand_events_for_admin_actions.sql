BEGIN;

ALTER TABLE public.events
    DROP CONSTRAINT IF EXISTS chk_events_entity_type;

ALTER TABLE public.events
    ALTER COLUMN entity_id TYPE TEXT
    USING entity_id::text;

ALTER TABLE public.events
    ADD CONSTRAINT chk_events_entity_type
    CHECK (
        entity_type IN (
            'ticket',
            'comment',
            'attachment',
            'tag',
            'project',
            'module',
            'workflow',
            'workflow_step',
            'workgroup',
            'user',
            'role',
            'permission',
            'system_setting'
        )
    );

COMMENT ON COLUMN public.events.entity_type IS 'Owned entity type affected by the event, including ticket entities and admin-managed entities';
COMMENT ON COLUMN public.events.entity_id IS 'Primary entity identifier affected by the event; stored as text to support UUID and natural-key admin entities';

COMMIT;
