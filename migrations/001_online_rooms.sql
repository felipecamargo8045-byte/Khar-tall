CREATE TABLE IF NOT EXISTS kt_rooms (
  code varchar(7) PRIMARY KEY,
  red_hash char(64) NOT NULL,
  blue_hash char(64),
  red_user_id uuid REFERENCES kt_users(id) ON DELETE SET NULL,
  blue_user_id uuid REFERENCES kt_users(id) ON DELETE SET NULL,
  state_json text NOT NULL,
  revision integer NOT NULL DEFAULT 0,
  deadline_ms bigint,
  status varchar(12) NOT NULL,
  last_event text,
  created_ms bigint NOT NULL,
  updated_ms bigint NOT NULL
);
CREATE INDEX IF NOT EXISTS kt_rooms_deadline ON kt_rooms(deadline_ms) WHERE status = 'active';
CREATE INDEX IF NOT EXISTS kt_rooms_red_user ON kt_rooms(red_user_id, updated_ms DESC);
CREATE INDEX IF NOT EXISTS kt_rooms_blue_user ON kt_rooms(blue_user_id, updated_ms DESC);
