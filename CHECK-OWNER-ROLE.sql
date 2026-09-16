-- OWNER TAG CHECK
-- Run this in Supabase SQL Editor to verify owner assignments.
select
  u.id as user_id,
  u.email,
  r.role
from auth.users u
left join public.player_roles r on r.user_id = u.id
order by u.created_at;
