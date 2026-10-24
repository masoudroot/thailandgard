ALTER TABLE outreach_messages
  ADD COLUMN IF NOT EXISTS scheduled_at timestamptz NOT NULL DEFAULT now();

ALTER TABLE outreach_messages
  ADD COLUMN IF NOT EXISTS error text;

CREATE INDEX IF NOT EXISTS outreach_messages_due_idx
  ON outreach_messages (status, scheduled_at);
