-- Create evaluations table to persist final assessments
create table if not exists public.evaluations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  summary text,
  data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

alter table public.evaluations enable row level security;

do $$ begin
  create policy "Users can view their own evaluations"
    on public.evaluations for select
    using (auth.uid() = user_id);
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "Users can insert their own evaluations"
    on public.evaluations for insert
    with check (auth.uid() = user_id);
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "Users can update their own evaluations"
    on public.evaluations for update
    using (auth.uid() = user_id);
exception when duplicate_object then null; end $$;

