BEGIN;

CREATE TABLE public.events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ticket_id UUID,
    event_type TEXT NOT NULL,
    entity_type TEXT NOT NULL,
    entity_id UUID NOT NULL,
    actor_id UUID,
    actor_name TEXT,
    payload JSONB NOT NULL DEFAULT '{}'::jsonb,
    occurred_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ,

    CONSTRAINT fk_events_ticket
        FOREIGN KEY (ticket_id)
        REFERENCES public.tickets(id)
        ON DELETE SET NULL,
    CONSTRAINT fk_events_actor
        FOREIGN KEY (actor_id)
        REFERENCES public.employees(id)
        ON DELETE SET NULL,

    CONSTRAINT chk_events_event_type_not_blank
        CHECK (btrim(event_type) <> ''),
    CONSTRAINT chk_events_entity_type
        CHECK (entity_type IN ('ticket', 'comment', 'attachment', 'tag')),
    CONSTRAINT chk_events_payload_object
        CHECK (jsonb_typeof(payload) = 'object')
);

CREATE INDEX idx_events_entity_timeline
    ON public.events (entity_type, entity_id, occurred_at DESC)
    WHERE deleted_at IS NULL;

CREATE INDEX idx_events_ticket_timeline
    ON public.events (ticket_id, occurred_at DESC)
    WHERE deleted_at IS NULL AND ticket_id IS NOT NULL;

CREATE INDEX idx_events_occurred_at
    ON public.events (occurred_at DESC)
    WHERE deleted_at IS NULL;

CREATE INDEX idx_events_event_type_occurred
    ON public.events (event_type, occurred_at DESC)
    WHERE deleted_at IS NULL;

CREATE INDEX idx_events_actor_occurred
    ON public.events (actor_id, occurred_at DESC)
    WHERE deleted_at IS NULL AND actor_id IS NOT NULL;

COMMENT ON TABLE public.events IS 'Business event stream for ticket timelines, profile activity, and future integrations';
COMMENT ON COLUMN public.events.ticket_id IS 'Nullable ticket reference for ticket-scoped timelines; null for future global/system events';
COMMENT ON COLUMN public.events.event_type IS 'Business event name in dot notation (e.g., ticket.updated, attachment.deleted)';
COMMENT ON COLUMN public.events.entity_type IS 'Owned entity type affected by the event: ticket, comment, attachment, or tag';
COMMENT ON COLUMN public.events.entity_id IS 'Primary entity identifier affected by the event';
COMMENT ON COLUMN public.events.actor_name IS 'Actor display-name snapshot kept for historical rendering';
COMMENT ON COLUMN public.events.payload IS 'Structured event metadata for backend message generation and integrations';

COMMIT;
