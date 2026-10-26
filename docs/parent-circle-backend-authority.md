# Parent Circle shared-backend authority

Se’kret Bip uses one canonical backend contract.

- **Canonical schema/RLS/RPC owner:** `jussray/Sekret-Bip`
- **Parent product runtime:** `jussray/Sekret-Bip-Parents`
- Specialized Bip repos may preserve/export source from Main Bip and build their own standalone experience, but they call the shared Main Bip backend contract.
- A specialized repo must not silently fork Supabase schema, RLS, auth authority, or RPC behavior into a second backend.
- Shared fixes are made in Main Bip first, proven there, then consumed/exported by the specialized app.
- Parent-only UI/navigation/product behavior stays in the parent repo.
- Production database application is always a separate mutation gate from repository merge.

## Parent Circle V2

The canonical backend surface is:

- `get_parent_community_feed(integer)`
- `create_parent_community_post(text,text)`
- `react_to_parent_community_post(uuid,text)`
- `reply_to_parent_community_post(uuid,text)`
- `report_parent_community_post(uuid,text)`

Authenticated clients do not receive raw cross-parent Parent Community rows. Restrictive RLS membranes keep `parent_community` circles, memberships, posts, comments, reactions, and V2 UUID reports behind the RPC contract while leaving other Circle kinds on their existing access model.
