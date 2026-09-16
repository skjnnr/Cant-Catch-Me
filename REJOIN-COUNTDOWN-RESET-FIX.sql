-- CAN'T CATCH ME - REJOIN / COUNTDOWN RESET FIX
-- Run once in Supabase SQL Editor.

create or replace function public.repair_queue_state(requested_match uuid)
returns jsonb
language plpgsql
security definer
set search_path=public
as $$
declare
  m public.game_matches;
  active_count integer;
begin
  select * into m
  from public.game_matches
  where id=requested_match
  for update;

  if m.id is null then
    return jsonb_build_object('success',false,'error','MATCH_NOT_FOUND');
  end if;

  -- Count only browsers that are actually alive.
  select count(*)::integer into active_count
  from public.match_players
  where match_id=requested_match
    and last_seen >= now()-interval '20 seconds';

  -- If a countdown no longer has enough connected players, completely reset it.
  if m.status='countdown' and active_count < m.min_players then
    update public.game_matches
    set status='waiting',
        countdown_started_at=null,
        queue_locks_at=null,
        queue_locked=false,
        updated_at=now()
    where id=requested_match;

    return jsonb_build_object('success',true,'status','waiting','players',active_count);
  end if;

  -- If enough connected players are waiting, always create a fresh 30-second countdown.
  if m.status='waiting' and active_count >= m.min_players then
    update public.game_matches
    set status='countdown',
        countdown_started_at=now(),
        queue_locks_at=now()+interval '30 seconds',
        queue_locked=false,
        updated_at=now()
    where id=requested_match;

    return jsonb_build_object('success',true,'status','countdown','players',active_count);
  end if;

  -- Expired countdown with enough live players: advance instead of leaving it at 0.
  if m.status='countdown'
     and m.queue_locks_at is not null
     and now() >= m.queue_locks_at
     and active_count >= m.min_players then
    update public.game_matches
    set status='loading',
        queue_locked=true,
        updated_at=now()
    where id=requested_match;

    return jsonb_build_object('success',true,'status','loading','players',active_count);
  end if;

  return jsonb_build_object('success',true,'status',m.status,'players',active_count);
end;
$$;

grant execute on function public.repair_queue_state(uuid) to authenticated;

-- Reset any currently expired/stuck open countdowns.
update public.game_matches
set status='waiting',
    countdown_started_at=null,
    queue_locks_at=null,
    queue_locked=false,
    min_players=2,
    updated_at=now()
where status='countdown'
  and queue_locked=false
  and (queue_locks_at is null or queue_locks_at <= now());

select 'Rejoin countdown reset fix installed!' as status;
