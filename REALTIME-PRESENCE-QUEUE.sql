-- ============================================================
-- CAN'T CATCH ME - REALTIME PRESENCE QUEUE
-- Run once in Supabase SQL Editor.
-- Presence replaces last_seen heartbeats as the queue connection source.
-- ============================================================

-- Sync match_players to the authenticated users currently reported by
-- the room's Realtime Presence channel. Only used while queue is open.
create or replace function public.sync_queue_from_presence(
  requested_match uuid,
  active_user_ids uuid[]
)
returns integer
language plpgsql
security definer
set search_path=public
as $$
declare
  removed_count integer:=0;
  m public.game_matches;
begin
  if auth.uid() is null then return 0; end if;

  select * into m
  from public.game_matches
  where id=requested_match
  for update;

  if m.id is null or m.status not in ('waiting','countdown') then
    return 0;
  end if;

  -- Caller must itself be one of the Presence users it reports.
  if not (auth.uid() = any(active_user_ids)) then
    return 0;
  end if;

  delete from public.match_players
  where match_id=requested_match
    and not (user_id = any(active_user_ids));

  get diagnostics removed_count=row_count;
  return removed_count;
end;
$$;

grant execute on function public.sync_queue_from_presence(uuid,uuid[])
to authenticated;


create or replace function public.update_queue_from_presence(
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

  -- Never trust a client to claim more connected players than the DB room contains.
  connected_players:=greatest(0,least(connected_players,db_count,m.max_players));

  if m.status='countdown' and connected_players < m.min_players then
    update public.game_matches
    set status='waiting',
        countdown_started_at=null,
        queue_locks_at=null,
        queue_locked=false,
        updated_at=now()
    where id=requested_match;

    return jsonb_build_object('success',true,'status','waiting','players',connected_players);
  end if;

  if m.status='waiting' and connected_players >= m.min_players then
    update public.game_matches
    set status='countdown',
        countdown_started_at=now(),
        queue_locks_at=now()+interval '30 seconds',
        queue_locked=false,
        updated_at=now()
    where id=requested_match;

    return jsonb_build_object('success',true,'status','countdown','players',connected_players);
  end if;

  return jsonb_build_object('success',true,'status',m.status,'players',connected_players);
end;
$$;

grant execute on function public.update_queue_from_presence(uuid,integer)
to authenticated;


create or replace function public.advance_queue_presence_at_zero(
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

  if connected_players < m.min_players then
    update public.game_matches
    set status='waiting',
        countdown_started_at=null,
        queue_locks_at=null,
        queue_locked=false,
        updated_at=now()
    where id=requested_match;

    return jsonb_build_object('success',false,'error','NOT_ENOUGH_CONNECTED_PLAYERS');
  end if;

  if m.status='countdown'
     and m.queue_locks_at is not null
     and now() >= m.queue_locks_at then

    update public.game_matches
    set status='loading',
        queue_locked=true,
        updated_at=now()
    where id=requested_match;

    return jsonb_build_object('success',true,'status','loading','players',connected_players);
  end if;

  return jsonb_build_object('success',true,'status',m.status,'players',connected_players);
end;
$$;

grant execute on function public.advance_queue_presence_at_zero(uuid,integer)
to authenticated;

-- Reset old testing queues so Presence starts from clean room state.
delete from public.match_players p
where p.match_id in (
  select id from public.game_matches
  where status in ('waiting','countdown')
    and queue_locked=false
);

update public.game_matches
set status='waiting',
    queue_locked=false,
    countdown_started_at=null,
    queue_locks_at=null,
    min_players=2,
    updated_at=now()
where status in ('waiting','countdown')
  and queue_locked=false;

alter table public.game_matches
alter column min_players set default 2;

select 'Realtime Presence queue installed!' as status;
