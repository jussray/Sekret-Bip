-- Supabase Postgres 17 deprecates pgjwt; Se'kret Bip uses Supabase Auth for JWT handling.
-- Intentionally omit CASCADE so this migration fails closed if a database object acquires a dependency.

drop extension if exists pgjwt;
