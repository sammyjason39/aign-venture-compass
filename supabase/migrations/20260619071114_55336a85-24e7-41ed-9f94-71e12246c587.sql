
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
