-- Phase 2: Schema & RLS for Cartograph
-- Eight core tables: projects, analyses, files, edges, routes, explanations, file_roles, insights
-- All rows belong to an organization with ON DELETE CASCADE
-- RLS enabled on all eight tables with predicate reading org_id from JWT claims

-- 1. Helper function to extract org_id from auth token
create or replace function current_org_id() returns text as $$
  select coalesce(
    nullif(current_setting('request.jwt.claim.org_id', true), ''),
    (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'org_id'),
    auth.jwt() ->> 'org_id'
  );
$$ language sql stable;

-- 2. Organizations table
create table if not exists organizations (
  id text primary key,
  name text not null,
  slug text,
  created_at timestamptz not null default now()
);

alter table organizations enable row level security;

create policy "organizations_isolation" on organizations
  for all using (id = current_org_id())
  with check (id = current_org_id());

-- 3. Projects table
create table if not exists projects (
  id uuid primary key default gen_random_uuid(),
  org_id text not null references organizations(id) on delete cascade,
  repo_url text not null,
  name text not null,
  default_branch text not null default 'main',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint projects_org_repo_unique unique (org_id, repo_url)
);

alter table projects enable row level security;

create policy "projects_isolation" on projects
  for all using (org_id = current_org_id())
  with check (org_id = current_org_id());

-- 4. Analyses table
create table if not exists analyses (
  id uuid primary key default gen_random_uuid(),
  org_id text not null references organizations(id) on delete cascade,
  project_id uuid not null references projects(id) on delete cascade,
  status text not null default 'pending', -- pending, parsing, graphing, complete, failed, stale
  stage text,
  stage_message text,
  error_message text,
  commit_hash text,
  total_files int not null default 0,
  parsed_files int not null default 0,
  skipped_files int not null default 0,
  coverage_percent numeric(5, 2) not null default 0.00,
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  created_at timestamptz not null default now()
);

alter table analyses enable row level security;

create policy "analyses_isolation" on analyses
  for all using (org_id = current_org_id())
  with check (org_id = current_org_id());

-- 5. Files table
create table if not exists files (
  id uuid primary key default gen_random_uuid(),
  org_id text not null references organizations(id) on delete cascade,
  analysis_id uuid not null references analyses(id) on delete cascade,
  path text not null,
  name text not null,
  extension text,
  size_bytes bigint,
  lines_count int,
  status text not null default 'parsed', -- parsed, skipped, partial
  skip_reason text,
  fan_in int not null default 0,
  fan_out int not null default 0,
  created_at timestamptz not null default now()
);

alter table files enable row level security;

create policy "files_isolation" on files
  for all using (org_id = current_org_id())
  with check (org_id = current_org_id());

-- 6. Edges table
create table if not exists edges (
  id uuid primary key default gen_random_uuid(),
  org_id text not null references organizations(id) on delete cascade,
  analysis_id uuid not null references analyses(id) on delete cascade,
  source_file_id uuid not null references files(id) on delete cascade,
  target_file_id uuid references files(id) on delete cascade,
  raw_import_path text not null,
  import_kind text not null default 'import', -- import, re_export, dynamic, require
  is_resolved boolean not null default true,
  unresolved_reason text,
  created_at timestamptz not null default now()
);

alter table edges enable row level security;

create policy "edges_isolation" on edges
  for all using (org_id = current_org_id())
  with check (org_id = current_org_id());

-- 7. Routes table
create table if not exists routes (
  id uuid primary key default gen_random_uuid(),
  org_id text not null references organizations(id) on delete cascade,
  analysis_id uuid not null references analyses(id) on delete cascade,
  file_id uuid not null references files(id) on delete cascade,
  method text not null, -- GET, POST, PUT, DELETE, PATCH, ALL
  pattern text not null,
  is_dynamic boolean not null default false,
  created_at timestamptz not null default now()
);

alter table routes enable row level security;

create policy "routes_isolation" on routes
  for all using (org_id = current_org_id())
  with check (org_id = current_org_id());

-- 8. Explanations table
create table if not exists explanations (
  id uuid primary key default gen_random_uuid(),
  org_id text not null references organizations(id) on delete cascade,
  analysis_id uuid not null references analyses(id) on delete cascade,
  file_id uuid not null references files(id) on delete cascade,
  summary text not null,
  model_version text,
  token_count int,
  created_at timestamptz not null default now()
);

alter table explanations enable row level security;

create policy "explanations_isolation" on explanations
  for all using (org_id = current_org_id())
  with check (org_id = current_org_id());

-- 9. File Roles table
create table if not exists file_roles (
  id uuid primary key default gen_random_uuid(),
  org_id text not null references organizations(id) on delete cascade,
  analysis_id uuid not null references analyses(id) on delete cascade,
  file_id uuid not null references files(id) on delete cascade,
  role text not null, -- page, route, controller, utility, component, schema
  confidence numeric(3, 2) not null default 1.00,
  created_at timestamptz not null default now()
);

alter table file_roles enable row level security;

create policy "file_roles_isolation" on file_roles
  for all using (org_id = current_org_id())
  with check (org_id = current_org_id());

-- 10. Insights table
create table if not exists insights (
  id uuid primary key default gen_random_uuid(),
  org_id text not null references organizations(id) on delete cascade,
  analysis_id uuid not null references analyses(id) on delete cascade,
  kind text not null, -- high_fan_in, cycle, orphan, barrel
  title text not null,
  description text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

alter table insights enable row level security;

create policy "insights_isolation" on insights
  for all using (org_id = current_org_id())
  with check (org_id = current_org_id());
