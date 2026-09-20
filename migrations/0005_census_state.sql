-- Tracks the census version each workspace has had applied, so a census bump
-- re-applies Al Shifa pins exactly once per workspace instead of on every load.
create table if not exists census_state (
  user_id       text primary key,
  version       integer not null default 0,
  applied_at    timestamptz not null default now()
);
