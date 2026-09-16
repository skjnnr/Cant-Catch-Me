-- CAN'T CATCH ME - MINIMUM 2 PLAYERS
alter table public.game_matches
alter column min_players set default 2;

update public.game_matches
set min_players=2,
    updated_at=now()
where status in ('waiting','countdown')
  and queue_locked=false;

select 'Minimum players is now 2!' as status;
