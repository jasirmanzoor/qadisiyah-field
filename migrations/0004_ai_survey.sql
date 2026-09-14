-- AI Field Survey Agent — on-demand, evidence-first photo surveys.
-- Additive only: no existing table is altered destructively.

create table if not exists ai_survey_runs (
  id             text primary key,
  user_id        text not null,
  dealership_id  text,
  mode           text not null default 'existing',
  status         text not null default 'queued',
  stage          text not null default 'queued',
  provider       text not null default '',
  model          text not null default '',
  photo_count    integer not null default 0,
  gps_at_showroom boolean not null default false,
  gps_lat        double precision,
  gps_lng        double precision,
  gps_accuracy   double precision,
  gps_source     text not null default 'unknown',
  gps_status     text not null default 'unresolved',
  summary        text not null default '',
  missing_info   text not null default '[]',
  error          text,
  applied        boolean not null default false,
  created_by     text not null default '',
  started_at     timestamptz not null default now(),
  completed_at   timestamptz
);
create index if not exists ai_runs_user_dealer_idx on ai_survey_runs (user_id, dealership_id);
create index if not exists ai_runs_user_started_idx on ai_survey_runs (user_id, started_at);

create table if not exists ai_field_proposals (
  id                 text primary key,
  run_id             text not null,
  user_id            text not null,
  dealership_id      text,
  field_key          text not null,
  value              text not null default 'null',
  confidence         text not null default 'unknown',
  status             text not null default 'unknown',
  source_types       text not null default '[]',
  reasoning          text not null default '',
  needs_verification boolean not null default true,
  existing_value     text not null default 'null',
  decision           text,
  decided_at         timestamptz,
  decided_by         text,
  created_at         timestamptz not null default now()
);
create index if not exists ai_proposals_run_idx on ai_field_proposals (user_id, run_id);
create index if not exists ai_proposals_dealer_idx on ai_field_proposals (user_id, dealership_id);

create table if not exists ai_evidence (
  id             text primary key,
  run_id         text not null,
  user_id        text not null,
  proposal_id    text,
  dealership_id  text,
  field_key      text not null default '',
  source_type    text not null default 'photo',
  photo_index    integer,
  photo_id       text,
  source_url     text,
  text           text not null default '',
  confidence     text not null default 'unknown',
  created_at     timestamptz not null default now()
);
create index if not exists ai_evidence_run_idx on ai_evidence (user_id, run_id);

-- Photos captured for an AI survey session stay dealership-based (unchanged);
-- the run association is an extra, nullable column.
alter table photos add column if not exists run_id text;
