-- TODO(BACKEND): Proposed PostgreSQL schema only. Not executed in the demo.
-- Confirm storage, retention, legal basis and administrator access before deployment.
CREATE TABLE leads (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    idempotency_key uuid NOT NULL UNIQUE,
    created_at timestamptz NOT NULL DEFAULT now(),
    name varchar(80) NOT NULL DEFAULT '',
    phone varchar(12) NOT NULL CHECK (phone ~ '^\+7[0-9]{10}$'),
    service varchar(24) NOT NULL CHECK (service IN ('drilling', 'cutting', 'reinforcement', 'demolition', 'consultation')),
    comment varchar(2000) NOT NULL DEFAULT '',
    estimate jsonb,
    source varchar(16) NOT NULL CHECK (source IN ('contact', 'calculator', 'callback')),
    consent_version varchar(32) NOT NULL,
    consent_at timestamptz NOT NULL,
    status varchar(16) NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'contacted', 'estimated', 'closed'))
);

CREATE INDEX leads_status_created_at_idx ON leads (status, created_at DESC);

-- TODO(BACKEND): Add access controls, notification outbox, retention/deletion
-- process and audit records as part of the actual server implementation.
