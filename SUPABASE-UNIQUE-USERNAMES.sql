-- CAN'T CATCH ME — UNIQUE USERNAMES
-- Run this once in Supabase > SQL Editor.
-- Usernames are unique ignoring capitalization:
-- Bryden, BRYDEN, and bryden count as the same username.

create table if not exists public.usernames (
  username text primary key,
  user_id uuid not null unique references auth.users(id) on delete cascade,
  display_username text not null,
  created_at timestamptz not null default now()
);

alter table public.usernames enable row level security;

-- No direct browser inserts/updates/deletes are allowed.
-- Username claiming goes through this security-definer function.
create or replace function public.claim_username(requested_username text)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  normalized text;
begin
  if auth.uid() is null then
    return false;
  end if;

  normalized := lower(trim(requested_username));

  if normalized !~ '^[a-z0-9_-]{3,20}$' then
    return false;
  end if;

  if exists(select 1 from public.usernames where user_id = auth.uid()) then
    return false;
  end if;

  begin
    insert into public.usernames(username,user_id,display_username)
    values(normalized,auth.uid(),trim(requested_username));
    return true;
  exception when unique_violation then
    return false;
  end;
end;
$$;

revoke all on function public.claim_username(text) from public;
grant execute on function public.claim_username(text) to authenticated;
