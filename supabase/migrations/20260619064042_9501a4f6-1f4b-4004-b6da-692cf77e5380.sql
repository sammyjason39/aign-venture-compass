create policy "Admins manage startup files"
  on storage.objects for all to authenticated
  using (bucket_id = 'startup-files' and public.has_role(auth.uid(), 'admin'))
  with check (bucket_id = 'startup-files' and public.has_role(auth.uid(), 'admin'));

create policy "Judges can read startup files"
  on storage.objects for select to authenticated
  using (bucket_id = 'startup-files' and public.has_role(auth.uid(), 'judge'));