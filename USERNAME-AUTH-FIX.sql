-- CAN'T CATCH ME — USERNAME / ACCOUNT FIX
-- Run this entire file once in Supabase > SQL Editor.

create table if not exists public.usernames (
  username text primary key,
  user_id uuid not null unique references auth.users(id) on delete cascade,
  display_username text not null,
  created_at timestamptz not null default now()
);

alter table public.usernames enable row level security;

create or replace function public.is_username_available(requested_username text)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare normalized text;
begin
  normalized := lower(trim(requested_username));
  if normalized !~ '^[a-z0-9_-]{3,20}$' then return false; end if;
  return not exists(select 1 from public.usernames where username=normalized);
end;
$$;

revoke all on function public.is_username_available(text) from public;
grant execute on function public.is_username_available(text) to anon, authenticated;

create or replace function public.claim_username(requested_username text)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare normalized text;
begin
  if auth.uid() is null then return false; end if;
  normalized := lower(trim(requested_username));
  if normalized !~ '^[a-z0-9_-]{3,20}$' then return false; end if;

  -- If this same account already owns this exact username, treat it as success.
  if exists(
    select 1 from public.usernames
    where user_id=auth.uid() and username=normalized
  ) then return true; end if;

  -- One different username per account.
  if exists(select 1 from public.usernames where user_id=auth.uid()) then
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
