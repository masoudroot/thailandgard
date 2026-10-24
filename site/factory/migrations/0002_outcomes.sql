CREATE TABLE IF NOT EXISTS outcomes (
  id uuid PRIMARY KEY,
  work_item_id uuid NOT NULL,
  metric text NOT NULL,
  outcome_window text NOT NULL,
  baseline numeric,
  value numeric,
  status text NOT NULL,
  recorded_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS outcomes_work_item_idx
  ON outcomes (work_item_id, recorded_at DESC);
