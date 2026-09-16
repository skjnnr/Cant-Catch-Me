-- CAN'T CATCH ME - QUEUE COUNTDOWN START FIX
-- Run this once in Supabase SQL Editor.

create or replace function public.start_queue_countdown_if_ready(
    requested_match uuid
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
    target_match public.game_matches;
    player_count integer;
begin
    select *
    into target_match
    from public.game_matches
    where id = requested_match
    for update;

    if target_match.id is null or target_match.status <> 'waiting' then
        return false;
    end if;

    select count(*)::integer
    into player_count
    from public.match_players
    where match_id = requested_match;

    if player_count < target_match.min_players then
        return false;
    end if;

    update public.game_matches
    set status = 'countdown',
        countdown_started_at = now(),
        queue_locks_at = now() + interval '30 seconds',
        updated_at = now()
    where id = requested_match
      and status = 'waiting';

    return true;
end;
$$;

grant execute on function public.start_queue_countdown_if_ready(uuid)
to authenticated;

-- Also repair any waiting rooms that already have enough players right now.
update public.game_matches m
set status = 'countdown',
    countdown_started_at = now(),
    queue_locks_at = now() + interval '30 seconds',
    updated_at = now()
where m.status = 'waiting'
  and m.queue_locked = false
  and (
    select count(*)
    from public.match_players p
    where p.match_id = m.id
  ) >= m.min_players;

select 'Queue countdown fix installed!' as status;
