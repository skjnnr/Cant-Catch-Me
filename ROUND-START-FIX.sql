-- CAN'T CATCH ME - ROUND START FIX
-- Run once in Supabase SQL Editor.

create or replace function public.start_bomb_round_safe(requested_match uuid)
returns jsonb
language plpgsql
security definer
set search_path=public
as $$
declare
  m public.game_matches;
  selected_player uuid;
  next_round integer;
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

  -- Idempotent: if another client already started it, just return current state.
  if m.status='active' and m.bomb_holder is not null then
    return jsonb_build_object(
      'success',true,'already_started',true,
      'round_number',m.round_number,
      'bomb_holder',m.bomb_holder,
      'bomb_explodes_at',m.bomb_explodes_at
    );
  end if;

  if m.status not in ('loading','between_rounds') then
    return jsonb_build_object('success',false,'error','MATCH_NOT_READY','status',m.status);
  end if;

  select user_id into selected_player
  from public.match_players
  where match_id=requested_match
    and alive=true
    and eliminated=false
  order by random()
  limit 1;

  if selected_player is null then
    return jsonb_build_object('success',false,'error','NO_ALIVE_PLAYERS');
  end if;

  next_round:=m.round_number+1;

  update public.game_matches
  set status='active',
      round_number=next_round,
      bomb_holder=selected_player,
      -- 5-second runner head start + 30-second bomb window.
      bomb_explodes_at=now()+interval '35 seconds',
      updated_at=now()
  where id=requested_match;

  return jsonb_build_object(
    'success',true,
    'round_number',next_round,
    'bomb_holder',selected_player,
    'release_at',now()+interval '5 seconds',
    'bomb_explodes_at',now()+interval '35 seconds'
  );
end;
$$;

grant execute on function public.start_bomb_round_safe(uuid) to authenticated;

-- Repair currently stuck loading matches immediately.
-- Pick one random alive player for each stuck match and begin Round 1.
do $$
declare
  m record;
  chosen uuid;
begin
  for m in
    select id,round_number
    from public.game_matches
    where status='loading'
      and bomb_holder is null
  loop
    select user_id into chosen
    from public.match_players
    where match_id=m.id
      and alive=true
      and eliminated=false
    order by random()
    limit 1;

    if chosen is not null then
      update public.game_matches
      set status='active',
          round_number=m.round_number+1,
          bomb_holder=chosen,
          bomb_explodes_at=now()+interval '35 seconds',
          updated_at=now()
      where id=m.id;
    end if;
  end loop;
end $$;

select 'Round start fix installed!' as status;
