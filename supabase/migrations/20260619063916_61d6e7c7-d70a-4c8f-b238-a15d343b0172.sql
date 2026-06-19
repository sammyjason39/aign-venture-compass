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
  updated_at timestamptz not null default now()
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