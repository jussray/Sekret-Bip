-- Harden server-owned application configuration tables when they exist.
--
-- Production has both tables with RLS enabled and no client policies, but their
-- creation is not present in the recorded migration ledger. Fresh databases
-- therefore must not fail merely because those out-of-band tables are absent.
--
-- This migration does not create configuration tables, modify rows, add client
-- policies, or expose configuration. It only preserves the server-only grant
-- contract for environments where either table already exists.

do $$
declare
  config_table text;
begin
  foreach config_table in array array['app_config', 'app_private_config']
  loop
    if to_regclass(format('public.%I', config_table)) is null then
      continue;
    end if;

    execute format('alter table public.%I enable row level security', config_table);
    execute format(
      'revoke all privileges on table public.%I from public, anon, authenticated',
      config_table
    );
    execute format(
      'grant all privileges on table public.%I to service_role',
      config_table
    );
    execute format(
      'comment on table public.%I is %L',
      config_table,
      case config_table
        when 'app_config' then
          'Server-owned application configuration. Client roles have no table privileges and no RLS policies.'
        else
          'Server-owned private application configuration. Client roles have no table privileges and no RLS policies.'
      end
    );
  end loop;
end
$$;
