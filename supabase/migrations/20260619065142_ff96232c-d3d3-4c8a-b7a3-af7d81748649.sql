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