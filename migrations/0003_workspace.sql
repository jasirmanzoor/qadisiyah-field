-- Shared field team: many users, one roster (user_id on data tables = workspace id).

create table if not exists workspaces (
  id          text primary key,
  name        text not null default 'Qadisiyah Field',
  join_code   text not null unique,
  created_by  text not null,
  created_at  timestamptz not null default now()
);

create table if not exists workspace_members (
  workspace_id text not null,
  user_id      text not null,
  role         text not null default 'member',
  created_at   timestamptz not null default now(),
  primary key (workspace_id, user_id)
);
create unique index if not exists workspace_members_user_idx on workspace_members (user_id);
