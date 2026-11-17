-- Restore the Circle V1/V2 policy-role boundary.
-- Circle V2 recreated these policies without an explicit TO clause, which made
-- them apply to PUBLIC. Open Bip is public inside the app, not anonymous API
-- access, so keep these policies scoped to signed-in users.

begin;

alter policy "circles select owner or member"
  on public.circles
  to authenticated;

alter policy "circles insert own"
  on public.circles
  to authenticated;

alter policy "posts select by circle visibility"
  on public.posts
  to authenticated;

alter policy "posts insert by author"
  on public.posts
  to authenticated;

commit;
