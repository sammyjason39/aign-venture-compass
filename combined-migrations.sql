-- =====================================================
-- COMBINED MIGATIONS FOR VENTURIS STARTUP CURATION SYSTEM
-- Paste this entire script into your Supabase SQL Editor
-- =====================================================

-- Clean up existing schema elements if they exist
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;
DROP FUNCTION IF EXISTS public.has_role(uuid, public.app_role) CASCADE;
DROP FUNCTION IF EXISTS public.set_updated_at() CASCADE;
DROP FUNCTION IF EXISTS public.startup_impact_aggregates() CASCADE;
DROP FUNCTION IF EXISTS public.startup_judge_aggregates() CASCADE;
DROP TABLE IF EXISTS public.judge_scores CASCADE;
DROP TABLE IF EXISTS public.startups CASCADE;
DROP TABLE IF EXISTS public.profiles CASCADE;
DROP TABLE IF EXISTS public.user_roles CASCADE;
DROP TABLE IF EXISTS public.allowed_users CASCADE;
DROP TABLE IF EXISTS public.ai_settings CASCADE;
DROP TYPE IF EXISTS public.app_role CASCADE;
DROP TYPE IF EXISTS public.startup_status CASCADE;
DROP TYPE IF EXISTS public.ai_eval_status CASCADE;

-- -----------------------------------------------------
-- Migration: 20260619063916_61d6e7c7-d70a-4c8f-b238-a15d343b0172.sql
-- -----------------------------------------------------
-- ============ ENUMS ============
create type public.app_role as enum ('admin', 'judge');
create type public.startup_status as enum ('draft', 'open', 'closed');
create type public.ai_eval_status as enum ('pending', 'processing', 'done', 'error');

-- ============ PROFILES ============
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  email text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

grant select, insert, update, delete on public.profiles to authenticated;
grant all on public.profiles to service_role;

alter table public.profiles enable row level security;

create policy "Profiles are viewable by authenticated users"
  on public.profiles for select to authenticated using (true);

create policy "Users can update own profile"
  on public.profiles for update to authenticated using (auth.uid() = id);

create policy "Users can insert own profile"
  on public.profiles for insert to authenticated with check (auth.uid() = id);

-- ============ USER ROLES ============
create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  role app_role not null,
  created_at timestamptz not null default now(),
  unique (user_id, role)
);

grant select on public.user_roles to authenticated;
grant all on public.user_roles to service_role;

alter table public.user_roles enable row level security;

create or replace function public.has_role(_user_id uuid, _role app_role)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.user_roles
    where user_id = _user_id and role = _role
  )
$$;

create policy "Users can view their own roles"
  on public.user_roles for select to authenticated
  using (auth.uid() = user_id);

create policy "Admins can view all roles"
  on public.user_roles for select to authenticated
  using (public.has_role(auth.uid(), 'admin'));

create policy "Admins can manage roles"
  on public.user_roles for all to authenticated
  using (public.has_role(auth.uid(), 'admin'))
  with check (public.has_role(auth.uid(), 'admin'));

-- ============ STARTUPS ============
create table public.startups (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  one_liner text,
  sector text,
  description text not null default '',
  deck_path text,
  transcript_path text,
  archetype text,
  archetype_confidence integer,
  status startup_status not null default 'draft',
  ai_status ai_eval_status not null default 'pending',
  ai_scores jsonb,
  ai_summary text,
  ai_strengths jsonb,
  ai_weaknesses jsonb,
  ai_risks jsonb,
  ai_recommendation text,
  ai_error text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  financial_pdf_path text,
  financial_data jsonb,
  financial_status text,
  financial_summary text,
  financial_error text,
  financial_generated_at timestamp with time zone
);

grant select, insert, update, delete on public.startups to authenticated;
grant all on public.startups to service_role;

alter table public.startups enable row level security;

create policy "Admins can do everything on startups"
  on public.startups for all to authenticated
  using (public.has_role(auth.uid(), 'admin'))
  with check (public.has_role(auth.uid(), 'admin'));

create policy "Judges can view open or closed startups"
  on public.startups for select to authenticated
  using (
    public.has_role(auth.uid(), 'judge') and status in ('open', 'closed')
  );

-- ============ JUDGE SCORES ============
create table public.judge_scores (
  id uuid primary key default gen_random_uuid(),
  startup_id uuid references public.startups(id) on delete cascade not null,
  judge_id uuid references auth.users(id) on delete cascade not null,
  scores jsonb not null default '{}'::jsonb,
  justification text,
  submitted boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (startup_id, judge_id)
);

grant select, insert, update, delete on public.judge_scores to authenticated;
grant all on public.judge_scores to service_role;

alter table public.judge_scores enable row level security;

create policy "Judges manage their own scores"
  on public.judge_scores for all to authenticated
  using (auth.uid() = judge_id)
  with check (auth.uid() = judge_id);

create policy "Admins can view all judge scores"
  on public.judge_scores for select to authenticated
  using (public.has_role(auth.uid(), 'admin'));

-- ============ TIMESTAMP TRIGGER ============
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_set_updated_at before update on public.profiles
  for each row execute function public.set_updated_at();
create trigger startups_set_updated_at before update on public.startups
  for each row execute function public.set_updated_at();
create trigger judge_scores_set_updated_at before update on public.judge_scores
  for each row execute function public.set_updated_at();

-- ============ NEW USER TRIGGER ============
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, email)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name'),
    new.email
  );
  insert into public.user_roles (user_id, role)
  values (new.id, 'judge')
  on conflict (user_id, role) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- -----------------------------------------------------
-- Migration: 20260619063936_5b9e2219-3f78-4e1a-85e9-28346bd36cbc.sql
-- -----------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

revoke execute on function public.set_updated_at() from public, anon, authenticated;
revoke execute on function public.handle_new_user() from public, anon, authenticated;

-- -----------------------------------------------------
-- Migration: 20260619064042_9501a4f6-1f4b-4004-b6da-692cf77e5380.sql
-- -----------------------------------------------------
create policy "Admins manage startup files"
  on storage.objects for all to authenticated
  using (bucket_id = 'startup-files' and public.has_role(auth.uid(), 'admin'))
  with check (bucket_id = 'startup-files' and public.has_role(auth.uid(), 'admin'));

create policy "Judges can read startup files"
  on storage.objects for select to authenticated
  using (bucket_id = 'startup-files' and public.has_role(auth.uid(), 'judge'));

-- -----------------------------------------------------
-- Migration: 20260619065142_ff96232c-d3d3-4c8a-b7a3-af7d81748649.sql
-- -----------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  existing_count integer;
begin
  insert into public.profiles (id, full_name, email)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name'),
    new.email
  );

  insert into public.user_roles (user_id, role)
  values (new.id, 'judge')
  on conflict (user_id, role) do nothing;

  -- Bootstrap: the first account ever created also becomes an admin.
  select count(*) into existing_count from public.profiles;
  if existing_count = 1 then
    insert into public.user_roles (user_id, role)
    values (new.id, 'admin')
    on conflict (user_id, role) do nothing;
  end if;

  return new;
end;
$$;

revoke execute on function public.handle_new_user() from public, anon, authenticated;

-- -----------------------------------------------------
-- Migration: 20260619070318_287ccb6b-9e39-426b-85d3-df8d24b4cd8e.sql
-- -----------------------------------------------------
-- 1) Restrict profile visibility: own profile + admins only
DROP POLICY IF EXISTS "Profiles are viewable by authenticated users" ON public.profiles;

CREATE POLICY "Users can view their own profile"
ON public.profiles
FOR SELECT
TO authenticated
USING (auth.uid() = id);

CREATE POLICY "Admins can view all profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));

-- 2) Lock down SECURITY DEFINER trigger functions from being called via the API
REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.set_updated_at() FROM PUBLIC, anon, authenticated;

-- 3) has_role is needed by signed-in users (RPC + RLS), but never by anonymous callers
REVOKE ALL ON FUNCTION public.has_role(uuid, app_role) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, app_role) TO authenticated;

-- -----------------------------------------------------
-- Migration: 20260619071114_55336a85-24e7-41ed-9f94-71e12246c587.sql
-- -----------------------------------------------------

-- 1. Allowlist table
CREATE TABLE public.allowed_users (
  email text PRIMARY KEY,
  role app_role NOT NULL DEFAULT 'judge',
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.allowed_users TO authenticated;
GRANT ALL ON public.allowed_users TO service_role;

ALTER TABLE public.allowed_users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage allowlist"
  ON public.allowed_users FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- 2. Seed the allowlist (store emails lowercased)
INSERT INTO public.allowed_users (email, role) VALUES
  ('netdaun@gmail.com', 'admin'),
  ('anjasmaradita@gmail.com', 'judge')
ON CONFLICT (email) DO UPDATE SET role = EXCLUDED.role;

-- 3. Gate role assignment by the allowlist on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
declare
  allowed_role app_role;
begin
  insert into public.profiles (id, full_name, email)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name'),
    new.email
  );

  select role into allowed_role
  from public.allowed_users
  where lower(email) = lower(new.email);

  if allowed_role is not null then
    insert into public.user_roles (user_id, role)
    values (new.id, allowed_role)
    on conflict (user_id, role) do nothing;
  end if;

  return new;
end;
$function$;

-- 4. Sync existing accounts to match the allowlist
-- Revoke roles from anyone whose email is not on the allowlist
DELETE FROM public.user_roles ur
USING public.profiles p
WHERE ur.user_id = p.id
  AND lower(p.email) NOT IN (SELECT lower(email) FROM public.allowed_users);

-- Grant the correct role to existing allowlisted users
INSERT INTO public.user_roles (user_id, role)
SELECT p.id, au.role
FROM public.profiles p
JOIN public.allowed_users au ON lower(au.email) = lower(p.email)
ON CONFLICT (user_id, role) DO NOTHING;


-- -----------------------------------------------------
-- Migration: 20260619071131_13d904ba-6d86-4216-a947-4126c9e08a01.sql
-- -----------------------------------------------------

REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;


-- -----------------------------------------------------
-- Migration: 20260624080533_28223436-94c5-4fe8-8ded-5e9ae5b510cd.sql
-- -----------------------------------------------------
ALTER TABLE public.startups ADD COLUMN IF NOT EXISTS valuation text;

-- -----------------------------------------------------
-- Migration: 20260624093739_d2ddd022-5521-494a-a408-aad92d792bf9.sql
-- -----------------------------------------------------
ALTER TABLE public.startups ADD COLUMN IF NOT EXISTS archetype_custom text;

-- -----------------------------------------------------
-- Migration: 20260624101917_58a3cc74-d2b4-4b48-9314-9c16791c3da6.sql
-- -----------------------------------------------------
ALTER TABLE public.startups ADD COLUMN IF NOT EXISTS sort_order integer;

-- Backfill existing rows so newest stays on top (matching current default ordering)
WITH ordered AS (
  SELECT id, row_number() OVER (ORDER BY created_at DESC) - 1 AS rn
  FROM public.startups
)
UPDATE public.startups s
SET sort_order = ordered.rn
FROM ordered
WHERE s.id = ordered.id AND s.sort_order IS NULL;

-- -----------------------------------------------------
-- Migration: 20260626060836_a9ad3bfc-b51a-44f5-8bed-0d2410b9c04d.sql
-- -----------------------------------------------------
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS salutation text;

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_salutation_check
  CHECK (salutation IS NULL OR salutation IN ('bapak', 'ibu'));

-- -----------------------------------------------------
-- Migration: 20260626064907_2558e4e8-8e62-4fed-926d-c059b447e95b.sql
-- -----------------------------------------------------
ALTER TABLE public.startups ADD COLUMN IF NOT EXISTS financial_report_path text;

-- -----------------------------------------------------
-- Migration: 20260626071251_cf4d5392-dedd-4411-b99a-64d995b6cb59.sql
-- -----------------------------------------------------
CREATE OR REPLACE FUNCTION public.startup_judge_aggregates()
RETURNS TABLE (startup_id uuid, judge_sum numeric, judge_count integer)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    js.startup_id,
    COALESCE(SUM(jo.overall), 0)::numeric AS judge_sum,
    COUNT(*)::integer AS judge_count
  FROM public.judge_scores js
  CROSS JOIN LATERAL (
    SELECT AVG((e.value)::numeric) AS overall
    FROM jsonb_each_text(js.scores) AS e(key, value)
    WHERE e.value ~ '^[0-9]+(\.[0-9]+)?$'
  ) jo
  WHERE js.submitted = true AND jo.overall IS NOT NULL
  GROUP BY js.startup_id;
$$;

GRANT EXECUTE ON FUNCTION public.startup_judge_aggregates() TO authenticated;
REVOKE EXECUTE ON FUNCTION public.startup_judge_aggregates() FROM anon;

-- -----------------------------------------------------
-- Migration: 20260626071314_ec7831cb-e77b-4751-8db8-e95715d5fd8a.sql
-- -----------------------------------------------------
REVOKE ALL ON FUNCTION public.startup_judge_aggregates() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.startup_judge_aggregates() TO authenticated;

-- -----------------------------------------------------
-- Migration: 20260626072310_1261426d-05e1-4cc1-99a0-0c3c48ac237c.sql
-- -----------------------------------------------------
CREATE OR REPLACE FUNCTION public.startup_impact_aggregates()
 RETURNS TABLE(startup_id uuid, impact_sum numeric, impact_count integer)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT
    js.startup_id,
    COALESCE(SUM(ji.impact), 0)::numeric AS impact_sum,
    COUNT(*)::integer AS impact_count
  FROM public.judge_scores js
  CROSS JOIN LATERAL (
    SELECT AVG((e.value)::numeric) AS impact
    FROM jsonb_each_text(js.scores) AS e(key, value)
    WHERE e.key IN ('prestige', 'socialImpact')
      AND e.value ~ '^[0-9]+(\.[0-9]+)?$'
  ) ji
  WHERE js.submitted = true AND ji.impact IS NOT NULL
  GROUP BY js.startup_id;
$function$;

-- -----------------------------------------------------
-- Migration: 20260626072333_2750ab5f-5cdc-4a57-a27e-f8aeca3aed4b.sql
-- -----------------------------------------------------
REVOKE EXECUTE ON FUNCTION public.startup_impact_aggregates() FROM anon, public;
GRANT EXECUTE ON FUNCTION public.startup_impact_aggregates() TO authenticated, service_role;

-- -----------------------------------------------------
-- Migration: 20260701091753_bec4c73a-f66c-4929-ba2e-1664dc2bd0c6.sql
-- -----------------------------------------------------
ALTER TABLE public.startups
  ADD COLUMN IF NOT EXISTS progress text NOT NULL DEFAULT 'get_to_know',
  ADD COLUMN IF NOT EXISTS progress_notes text;

ALTER TABLE public.startups
  DROP CONSTRAINT IF EXISTS startups_progress_check;

ALTER TABLE public.startups
  ADD CONSTRAINT startups_progress_check
  CHECK (progress IN ('get_to_know', 'deep_dive', 'investment_plan'));

-- -----------------------------------------------------
-- Migration: 20260702000000_ai_settings.sql
-- -----------------------------------------------------
-- Create public.ai_settings table
CREATE TABLE IF NOT EXISTS public.ai_settings (
  id integer PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  mode text NOT NULL DEFAULT 'full_cloud',
  ollama_url text NOT NULL DEFAULT 'http://localhost:11434',
  ollama_model text NOT NULL DEFAULT 'llama3',
  openrouter_url text NOT NULL DEFAULT 'https://openrouter.ai/api/v1',
  openrouter_key text,
  openrouter_model text NOT NULL DEFAULT 'google/gemini-2.5-flash',
  updated_at timestamp with time zone DEFAULT now() NOT NULL
);

-- Enable RLS
ALTER TABLE public.ai_settings ENABLE ROW LEVEL SECURITY;

-- Policies
DROP POLICY IF EXISTS "Anyone authenticated can view AI settings" ON public.ai_settings;
CREATE POLICY "Anyone authenticated can view AI settings"
  ON public.ai_settings FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Admins can manage AI settings" ON public.ai_settings;
CREATE POLICY "Admins can manage AI settings"
  ON public.ai_settings FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Insert default row
INSERT INTO public.ai_settings (id, mode, ollama_url, ollama_model, openrouter_url, openrouter_key, openrouter_model)
VALUES (1, 'full_cloud', 'http://localhost:11434', 'llama3', 'https://openrouter.ai/api/v1', NULL, 'google/gemini-2.5-flash')
ON CONFLICT (id) DO NOTHING;

-- Grant permissions
GRANT SELECT ON public.ai_settings TO authenticated;
GRANT ALL ON public.ai_settings TO service_role;


-- -----------------------------------------------------
-- Seed Admin User
-- -----------------------------------------------------
INSERT INTO public.allowed_users (email, role) VALUES
  ('admin@venturis.com', 'admin')
ON CONFLICT (email) DO UPDATE SET role = EXCLUDED.role;

