-- CAN'T CATCH ME - PRESENCE QUEUE STATE FIX
-- Run once in Supabase SQL Editor.

create or replace function public.force_queue_state_from_presence(
  requested_match uuid,
  connected_players integer
)
returns jsonb
language plpgsql
security definer
set search_path=public
as $$
declare
  m public.game_matches;
  db_count integer;
begin
  if auth.uid() is null then
    return jsonb_build_object('success',false,'error','NOT_LOGGED_IN');
  end if;

  select * into m
  from public.game_matches
  where id=requested_match
  for update;

  if m.id is null then
    return jsonb_build_object('success',false,'error','MATCH_NOT_FOUND');
  end if;

  select count(*)::integer into db_count
  from public.match_players
  where match_id=requested_match;

  connected_players:=greatest(0,least(connected_players,db_count,m.max_players));

  -- Not enough actually connected: always reset any open queue to waiting.
  if connected_players < m.min_players
     and m.status in ('waiting','countdown') then
    update public.game_matches
    set status='waiting',
        countdown_started_at=null,
        queue_locks_at=null,
        queue_locked=false,
        updated_at=now()
    where id=requested_match;

    return jsonb_build_object(
      'success',true,'status','waiting','players',connected_players
    );
  end if;

  -- Enough actually connected: start a completely fresh countdown.
  if connected_players >= m.min_players
     and m.status='waiting' then
    update public.game_matches
    set status='countdown',
        countdown_started_at=now(),
        queue_locks_at=now()+interval '30 seconds',
        queue_locked=false,
        updated_at=now()
    where id=requested_match;

    return jsonb_build_object(
      'success',true,'status','countdown','players',connected_players
    );
  end if;

  -- Expired countdown with enough connected: advance immediately.
  if connected_players >= m.min_players
     and m.status='countdown'
     and m.queue_locks_at is not null
     and now() >= m.queue_locks_at then
    update public.game_matches
    set status='loading',
        queue_locked=true,
        updated_at=now()
    where id=requested_match;

    return jsonb_build_object(
      'success',true,'status','loading','players',connected_players
    );
  end if;

  return jsonb_build_object(
    'success',true,'status',m.status,'players',connected_players
  );
end;
$$;

grant execute on function public.force_queue_state_from_presence(uuid,integer)
to authenticated;

-- Repair all currently stale open countdowns so deployment starts clean.
update public.game_matches
set status='waiting',
    queue_locked=false,
    countdown_started_at=null,
    queue_locks_at=null,
    min_players=2,
    updated_at=now()
where status='countdown'
  and queue_locked=false
  and queue_locks_at <= now();

select 'Presence queue state fix installed!' as status;
