-- CAN'T CATCH ME - 2 PLAYER TEST MINIMUM
alter table public.game_matches
alter column min_players set default 2;

update public.game_matches
set min_players = 2
where status in ('waiting', 'countdown');
