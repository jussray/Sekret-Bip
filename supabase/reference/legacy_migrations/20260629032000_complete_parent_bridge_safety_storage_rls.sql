-- Complete the remaining non-anonymous session guards for sensitive tables.

alter policy "parent_notes: parent insert"
on public.parent_notes
with check (
  public.is_non_anonymous_user()
  and auth.uid() = parent_user_id
  and exists (
    select 1
    from public.parent_links pl
    where pl.parent_user_id = auth.uid()
      and pl.teen_user_id = parent_notes.teen_user_id
      and pl.status = 'active'
      and pl.is_active = true
  )
);

alter policy bridge_shares_owner_update
on public.bridge_shares
to authenticated
using (public.is_non_anonymous_user() and auth.uid() = user_id)
with check (public.is_non_anonymous_user() and auth.uid() = user_id);

alter policy bridge_shares_owner_delete
on public.bridge_shares
to authenticated
using (public.is_non_anonymous_user() and auth.uid() = user_id);

alter policy "bridge_signals: teen read"
on public.bridge_signals
to authenticated
using (public.is_non_anonymous_user() and auth.uid() = teen_user_id);

alter policy "bridge_signals: teen insert"
on public.bridge_signals
to authenticated
with check (public.is_non_anonymous_user() and auth.uid() = teen_user_id);

alter policy "bridge_signals: teen update"
on public.bridge_signals
to authenticated
using (public.is_non_anonymous_user() and auth.uid() = teen_user_id)
with check (public.is_non_anonymous_user() and auth.uid() = teen_user_id);

alter policy "bridge_signals: linked parent read"
on public.bridge_signals
to authenticated
using (
  public.is_non_anonymous_user()
  and revoked_at is null
  and exists (
    select 1
    from public.parent_links pl
    where pl.teen_user_id = bridge_signals.teen_user_id
      and pl.parent_user_id = auth.uid()
      and pl.status = 'active'
      and pl.is_active = true
  )
);

alter policy "safety alerts insert teen only"
on public.safety_alerts
with check (public.is_non_anonymous_user() and teen_user_id = auth.uid());

alter policy "safety alerts select linked teen or parent"
on public.safety_alerts
using (
  public.is_non_anonymous_user()
  and (teen_user_id = auth.uid() or parent_user_id = auth.uid())
);

alter policy "safety alerts update parent or teen"
on public.safety_alerts
using (
  public.is_non_anonymous_user()
  and (teen_user_id = auth.uid() or parent_user_id = auth.uid())
)
with check (
  public.is_non_anonymous_user()
  and (teen_user_id = auth.uid() or parent_user_id = auth.uid())
);

alter policy "post media insert own folder"
on storage.objects
with check (
  public.is_non_anonymous_user()
  and bucket_id = any (array['bip-post-media'::text, 'bip-scrapbook-media'::text])
  and (storage.foldername(name))[1] = auth.uid()::text
);

alter policy "post media select by attachment visibility"
on storage.objects
using (
  public.is_non_anonymous_user()
  and bucket_id = any (array['bip-post-media'::text, 'bip-scrapbook-media'::text])
  and public.can_access_storage_object(bucket_id, name, auth.uid())
);

alter policy "post media update own folder"
on storage.objects
using (
  public.is_non_anonymous_user()
  and bucket_id = any (array['bip-post-media'::text, 'bip-scrapbook-media'::text])
  and (storage.foldername(name))[1] = auth.uid()::text
)
with check (
  public.is_non_anonymous_user()
  and bucket_id = any (array['bip-post-media'::text, 'bip-scrapbook-media'::text])
  and (storage.foldername(name))[1] = auth.uid()::text
);

alter policy "post media delete own folder"
on storage.objects
using (
  public.is_non_anonymous_user()
  and bucket_id = any (array['bip-post-media'::text, 'bip-scrapbook-media'::text])
  and (storage.foldername(name))[1] = auth.uid()::text
);
