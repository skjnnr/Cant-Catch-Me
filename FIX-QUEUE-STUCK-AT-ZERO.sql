-- CAN'T CATCH ME - FIX QUEUE STUCK AT 0
-- Run once in Supabase SQL Editor.

create or replace function public.advance_queue_at_zero(
    requested_match uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
    m public.game_matches;
    n integer;
begin
    select * into m
    from public.game_matches
    where id=requested_match
    for update;

    if m.id is null then
        return jsonb_build_object('success',false,'error','MATCH_NOT_FOUND');
    end if;

    select count(*)::integer into n
    from public.match_players
    where match_id=requested_match
      and last_seen >= now() - interval '15 seconds';

    if n < m.min_players then
        update public.game_matches
        set status='waiting',
            countdown_started_at=null,
            queue_locks_at=null,
            queue_locked=false,
            updated_at=now()
        where id=requested_match;
        return jsonb_build_object('success',false,'error','NOT_ENOUGH_PLAYERS','players',n);
    end if;

    if m.status='countdown'
       and m.queue_locks_at is not null
       and now() >= m.queue_locks_at then
        update public.game_matches
        set status='loading',
            queue_locked=true,
            updated_at=now()
        where id=requested_match;

        return jsonb_build_object('success',true,'status','loading','players',n);
    end if;

    return jsonb_build_object('success',true,'status',m.status,'players',n);
end;
$$;

grant execute on function public.advance_queue_at_zero(uuid) to authenticated;

-- Repair currently stuck countdowns that are already at/past zero.
update public.game_matches m
set status='loading',
    queue_locked=true,
    updated_at=now()
where m.status='countdown'
  and m.queue_locks_at <= now()
  and (
    select count(*)
    from public.match_players p
    where p.match_id=m.id
      and p.last_seen >= now() - interval '15 seconds'
  ) >= m.min_players;

select '0-second queue fix installed!' as status;
