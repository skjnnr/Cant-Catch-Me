-- ============================================================
-- CAN'T CATCH ME - NETWORKED BOMB FEATURE
-- Run this ONCE in Supabase SQL Editor.
-- Requires the existing game_matches + match_players tables.
-- ============================================================

-- Transfer the bomb when the current holder touches another alive player.
-- The server verifies that the caller is the current bomb holder.
create or replace function public.tag_player_safe(
  requested_match uuid,
  tagged_player uuid
)
returns jsonb
language plpgsql
security definer
set search_path=public
as $$
declare
  m public.game_matches;
  target public.match_players;
  caller public.match_players;
  new_explosion timestamptz;
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

  if m.status <> 'active' then
    return jsonb_build_object('success',false,'error','MATCH_NOT_ACTIVE');
  end if;

  if m.bomb_holder <> auth.uid() then
    return jsonb_build_object('success',false,'error','NOT_BOMB_HOLDER');
  end if;

  if tagged_player is null or tagged_player=auth.uid() then
    return jsonb_build_object('success',false,'error','INVALID_TARGET');
  end if;

  select * into caller from public.match_players
  where match_id=requested_match and user_id=auth.uid();

  select * into target from public.match_players
  where match_id=requested_match and user_id=tagged_player;

  if caller.user_id is null or caller.eliminated or caller.alive=false then
    return jsonb_build_object('success',false,'error','HOLDER_NOT_ALIVE');
  end if;

  if target.user_id is null or target.eliminated or target.alive=false then
    return jsonb_build_object('success',false,'error','TARGET_NOT_ALIVE');
  end if;

  -- Every successful tag adds exactly 3 seconds to the remaining bomb time.
  new_explosion=greatest(coalesce(m.bomb_explodes_at,now()),now())+interval '3 seconds';

  update public.game_matches
  set bomb_holder=tagged_player,
      bomb_explodes_at=new_explosion,
      updated_at=now()
  where id=requested_match;

  return jsonb_build_object(
    'success',true,
    'bomb_holder',tagged_player,
    'bomb_explodes_at',new_explosion
  );
end;
$$;

grant execute on function public.tag_player_safe(uuid,uuid) to authenticated;


-- Eliminate whoever is holding the bomb when its server-side timer reaches zero.
create or replace function public.detonate_bomb_safe(requested_match uuid)
returns jsonb
language plpgsql
security definer
set search_path=public
as $$
declare
  m public.game_matches;
  remaining integer;
  survivor uuid;
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

  -- Idempotent: only an active, expired bomb can detonate.
  if m.status <> 'active' or m.bomb_holder is null then
    return jsonb_build_object('success',true,'already_resolved',true,'status',m.status);
  end if;

  if m.bomb_explodes_at is null or now() < m.bomb_explodes_at then
    return jsonb_build_object('success',false,'error','BOMB_NOT_EXPIRED');
  end if;

  update public.match_players
  set alive=false,
      eliminated=true
  where match_id=requested_match
    and user_id=m.bomb_holder;

  select count(*)::integer into remaining
  from public.match_players
  where match_id=requested_match
    and alive=true
    and eliminated=false;

  if remaining <= 1 then
    select user_id into survivor
    from public.match_players
    where match_id=requested_match
      and alive=true
      and eliminated=false
    limit 1;

    update public.game_matches
    set status='finished',
        winner_id=survivor,
        bomb_holder=null,
        bomb_explodes_at=null,
        updated_at=now()
    where id=requested_match;

    return jsonb_build_object(
      'success',true,'status','finished',
      'eliminated',m.bomb_holder,'winner_id',survivor
    );
  end if;

  update public.game_matches
  set status='between_rounds',
      bomb_holder=null,
      bomb_explodes_at=null,
      updated_at=now()
  where id=requested_match;

  return jsonb_build_object(
    'success',true,'status','between_rounds',
    'eliminated',m.bomb_holder,'remaining',remaining
  );
end;
$$;

grant execute on function public.detonate_bomb_safe(uuid) to authenticated;

select 'Networked bomb feature installed!' as status;
