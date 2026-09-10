-- Qadisiyah Field — dealership survey, research, and ops (per-user)

create table if not exists dealerships (
  id            text primary key,
  user_id       text not null,
  name_en       text not null,
  name_ar       text not null default '',
  lat           double precision not null,
  lng           double precision not null,
  listed_phone  text not null default '',
  seed_note     text not null default '',
  status        text not null default 'not_visited',
  flags         text not null default '{}',
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index if not exists dealerships_user_id_idx on dealerships (user_id);

create table if not exists surveys (
  id             text primary key,
  user_id        text not null,
  dealership_id  text not null,
  payload        text not null default '{}',
  step           integer not null default 0,
  updated_at     timestamptz not null default now(),
  unique (user_id, dealership_id)
);
create index if not exists surveys_user_dealer_idx on surveys (user_id, dealership_id);

create table if not exists photos (
  id             text primary key,
  user_id        text not null,
  dealership_id  text not null,
  data_url       text not null,
  lat            double precision,
  lng            double precision,
  captured_at    timestamptz not null default now()
);
create index if not exists photos_user_dealer_idx on photos (user_id, dealership_id);

create table if not exists followups (
  id             text primary key,
  user_id        text not null,
  dealership_id  text not null,
  title          text not null,
  due_date       text,
  done           boolean not null default false,
  created_at     timestamptz not null default now()
);
create index if not exists followups_user_idx on followups (user_id);

create table if not exists research_tasks (
  id           text primary key,
  user_id      text not null,
  name         text not null,
  instruction  text not null,
  target_field text not null,
  sources      text not null default '[]',
  schedule     text not null default 'on_demand',
  enabled      boolean not null default true,
  created_at   timestamptz not null default now()
);
create index if not exists research_tasks_user_idx on research_tasks (user_id);

create table if not exists agent_findings (
  id             text primary key,
  user_id        text not null,
  dealership_id  text not null,
  task_id        text,
  field_key      text not null,
  value          text not null,
  source_url     text,
  confidence     text not null default 'medium',
  retrieved_at   timestamptz not null default now(),
  accepted       boolean
);
create index if not exists agent_findings_user_dealer_idx on agent_findings (user_id, dealership_id);

create table if not exists notifications (
  id             text primary key,
  user_id        text not null,
  kind           text not null,
  title          text not null,
  body           text not null,
  dealership_id  text,
  read           boolean not null default false,
  created_at     timestamptz not null default now()
);
create index if not exists notifications_user_idx on notifications (user_id);

create table if not exists research_settings (
  user_id     text primary key,
  daily_cap   integer not null default 20,
  runs_today  integer not null default 0,
  runs_date   text
);

create table if not exists pipeline (
  user_id        text not null,
  dealership_id  text not null,
  stage          text not null default 'surveyed',
  primary key (user_id, dealership_id)
);
