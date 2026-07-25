-- LiveTask database setup
-- Run this file in Supabase Dashboard > SQL Editor.

create extension if not exists pgcrypto;

create table if not exists public.tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null check (char_length(title) between 1 and 120),
  description text not null default '' check (char_length(description) <= 600),
  status text not null default 'todo' check (status in ('todo', 'in_progress', 'done')),
  priority text not null default 'medium' check (priority in ('low', 'medium', 'high')),
  due_date date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists tasks_user_id_idx on public.tasks(user_id);
create index if not exists tasks_user_created_idx on public.tasks(user_id, created_at desc);
create index if not exists tasks_user_status_idx on public.tasks(user_id, status);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists tasks_set_updated_at on public.tasks;
create trigger tasks_set_updated_at
before update on public.tasks
for each row execute function public.set_updated_at();

alter table public.tasks replica identity full;
alter table public.tasks enable row level security;

-- Enable database-change events for Supabase Realtime.
do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'tasks'
  ) then
    alter publication supabase_realtime add table public.tasks;
  end if;
end
$$;

revoke all on table public.tasks from anon;
grant select, insert, update, delete on table public.tasks to authenticated;

-- A signed-in user can only read their own tasks.
drop policy if exists "Users can read their own tasks" on public.tasks;
create policy "Users can read their own tasks"
on public.tasks
for select
to authenticated
using ((select auth.uid()) = user_id);

-- The inserted row must belong to the signed-in user.
drop policy if exists "Users can create their own tasks" on public.tasks;
create policy "Users can create their own tasks"
on public.tasks
for insert
to authenticated
with check ((select auth.uid()) = user_id);

-- Users can only update rows that already belong to them, and ownership cannot be changed.
drop policy if exists "Users can update their own tasks" on public.tasks;
create policy "Users can update their own tasks"
on public.tasks
for update
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

-- Users can only delete their own rows.
drop policy if exists "Users can delete their own tasks" on public.tasks;
create policy "Users can delete their own tasks"
on public.tasks
for delete
to authenticated
using ((select auth.uid()) = user_id);

-- Private visual boards created with the HTML Canvas workspace.
create table if not exists public.whiteboards (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null check (char_length(title) between 1 and 80),
  snapshot text not null,
  background text not null default '#ffffff',
  linked_task_id uuid references public.tasks(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists whiteboards_user_updated_idx on public.whiteboards(user_id, updated_at desc);

drop trigger if exists whiteboards_set_updated_at on public.whiteboards;
create trigger whiteboards_set_updated_at
before update on public.whiteboards
for each row execute function public.set_updated_at();

alter table public.whiteboards enable row level security;
revoke all on table public.whiteboards from anon;
grant select, insert, update, delete on table public.whiteboards to authenticated;

drop policy if exists "Users can read their own whiteboards" on public.whiteboards;
create policy "Users can read their own whiteboards"
on public.whiteboards for select to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists "Users can create their own whiteboards" on public.whiteboards;
create policy "Users can create their own whiteboards"
on public.whiteboards for insert to authenticated
with check ((select auth.uid()) = user_id);

drop policy if exists "Users can update their own whiteboards" on public.whiteboards;
create policy "Users can update their own whiteboards"
on public.whiteboards for update to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

drop policy if exists "Users can delete their own whiteboards" on public.whiteboards;
create policy "Users can delete their own whiteboards"
on public.whiteboards for delete to authenticated
using ((select auth.uid()) = user_id);
