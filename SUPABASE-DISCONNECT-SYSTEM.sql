-- ============================================================
-- CAN'T CATCH ME - DISCONNECT / HEARTBEAT SYSTEM
-- Run once in Supabase SQL Editor.
-- ============================================================

-- Track the last time each queued player was confirmed online.
alter table public.match_players
add column if not exists last_seen timestamptz not null default now();

-- Update the current player's heartbeat.
create or replace function public.heartbeat_game_match(
    requested_match uuid
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
    if auth.uid() is null then
        return false;
    end if;

    update public.match_players
    set last_seen = now()
    where match_id = requested_match
      and user_id = auth.uid();

    return found;
end;
$$;

grant execute on function public.heartbeat_game_match(uuid)
to authenticated;

-- Remove players who disappeared while a match is still waiting/counting down.
create or replace function public.cleanup_disconnected_match_players(
    requested_match uuid
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
    removed_count integer := 0;
    remaining_count integer := 0;
    target_match public.game_matches;
begin
    select *
    into target_match
    from public.game_matches
    where id = requested_match
    for update;

    if target_match.id is null then
        return 0;
    end if;

    -- During the queue, a player missing heartbeats for 15 seconds is removed.
    -- We intentionally do not remove active-match players here; elimination/
    -- reconnect behavior can be handled separately later.
    if target_match.status in ('waiting','countdown') then
        delete from public.match_players
        where match_id = requested_match
          and last_seen < now() - interval '15 seconds';

        get diagnostics removed_count = row_count;

        select count(*)::integer
        into remaining_count
        from public.match_players
        where match_id = requested_match;

        -- If somebody disconnects during the 30-second countdown and the
        -- lobby falls below the minimum, cancel the countdown.
        if target_match.status = 'countdown'
           and remaining_count < target_match.min_players then
            update public.game_matches
            set status = 'waiting',
                countdown_started_at = null,
                queue_locks_at = null,
                updated_at = now()
            where id = requested_match;
        end if;
    end if;

    return removed_count;
end;
$$;

grant execute on function public.cleanup_disconnected_match_players(uuid)
to authenticated;

-- Make testing minimum consistently 2 for existing open rooms and future rooms.
alter table public.game_matches
alter column min_players set default 2;

update public.game_matches
set min_players = 2,
    updated_at = now()
where status in ('waiting','countdown')
  and queue_locked = false;

-- Clean stale test players immediately so old 3/12-style counts disappear.
delete from public.match_players p
where p.match_id in (
    select id
    from public.game_matches
    where status in ('waiting','countdown')
      and queue_locked = false
);

-- Reset now-empty open test rooms to waiting.
update public.game_matches
set status='waiting',
    countdown_started_at=null,
    queue_locks_at=null,
    updated_at=now()
where status in ('waiting','countdown')
  and queue_locked=false;

select 'Disconnect system installed - open queues cleaned!' as status;
