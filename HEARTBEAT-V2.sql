-- CAN'T CATCH ME - HEARTBEAT V2
-- Run this once in Supabase SQL Editor.

alter table public.match_players
add column if not exists last_seen timestamptz not null default now();

create or replace function public.heartbeat_game_match(requested_match uuid)
returns boolean
language plpgsql
security definer
set search_path=public
as $$
begin
  if auth.uid() is null then return false; end if;

  update public.match_players
  set last_seen=now()
  where match_id=requested_match
    and user_id=auth.uid();

  return found;
end;
$$;

grant execute on function public.heartbeat_game_match(uuid) to authenticated;

create or replace function public.cleanup_disconnected_match_players(requested_match uuid)
returns integer
language plpgsql
security definer
set search_path=public
as $$
declare
  removed integer:=0;
  remaining integer:=0;
  m public.game_matches;
begin
  select * into m from public.game_matches where id=requested_match for update;
  if m.id is null then return 0; end if;

  if m.status in ('waiting','countdown') then
    -- 20-second grace window; browser sends every 3 seconds.
    delete from public.match_players
    where match_id=requested_match
      and last_seen < now()-interval '20 seconds';
    get diagnostics removed=row_count;

    select count(*)::integer into remaining
    from public.match_players where match_id=requested_match;

    if m.status='countdown' and remaining<m.min_players then
      update public.game_matches
      set status='waiting',countdown_started_at=null,queue_locks_at=null,
          queue_locked=false,updated_at=now()
      where id=requested_match;
    end if;
  end if;
  return removed;
end;
$$;

grant execute on function public.cleanup_disconnected_match_players(uuid) to authenticated;

-- Reset open test queues so both browsers can rejoin cleanly.
delete from public.match_players p
where p.match_id in (
  select id from public.game_matches
  where status in ('waiting','countdown') and queue_locked=false
);

update public.game_matches
set status='waiting',queue_locked=false,countdown_started_at=null,
    queue_locks_at=null,min_players=2,updated_at=now()
where status in ('waiting','countdown') and queue_locked=false;

alter table public.game_matches alter column min_players set default 2;

select 'Heartbeat V2 installed - test queues reset!' as status;
