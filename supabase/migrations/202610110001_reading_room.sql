-- Non-destructive initial schema. Apply once through Supabase CLI or SQL editor.
create table public.workspaces (
 id uuid primary key default gen_random_uuid(), user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
 name text not null check(length(name) between 1 and 100), language text not null default 'en', color text not null default '#355c4a', icon text not null default '📚',
 created_at timestamptz not null default now(), unique(id,user_id)
);
create table public.entries (
 id uuid primary key default gen_random_uuid(), user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
 workspace_id uuid not null, parent_id uuid,
 kind text not null check(kind in ('book','article','chapter','note','vocabulary','quote','card','action','journal')),
 title text not null check(length(title) between 1 and 500), data jsonb not null default '{}',
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 unique(id,workspace_id,user_id),
 foreign key(workspace_id,user_id) references public.workspaces(id,user_id) on delete cascade,
 foreign key(parent_id,workspace_id,user_id) references public.entries(id,workspace_id,user_id) on delete cascade,
 check(parent_id is distinct from id), check(jsonb_typeof(data)='object')
);
create index entries_workspace_kind on public.entries(workspace_id,kind);
create index entries_parent on public.entries(parent_id);
create index entries_owner on public.entries(user_id);
create index entries_search on public.entries using gin(to_tsvector('simple',title || ' ' || data::text));
create table public.review_logs (
 id uuid primary key default gen_random_uuid(),user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
 card_id uuid not null references public.entries(id) on delete cascade, rating integer not null check(rating between 1 and 4),
 reviewed_at timestamptz not null default now(), next_due timestamptz not null, log jsonb not null
);
create index review_logs_owner_date on public.review_logs(user_id,reviewed_at);
create table public.uploaded_assets (
 id uuid primary key default gen_random_uuid(),user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
 path text not null unique,original_name text not null,created_at timestamptz not null default now()
);
alter table public.workspaces enable row level security;
alter table public.entries enable row level security;
alter table public.review_logs enable row level security;
alter table public.uploaded_assets enable row level security;
create policy own_workspaces on public.workspaces for all to authenticated using(user_id=(select auth.uid())) with check(user_id=(select auth.uid()));
create policy own_entries on public.entries for all to authenticated using(user_id=(select auth.uid())) with check(user_id=(select auth.uid()));
create policy own_reviews on public.review_logs for select to authenticated using(user_id=(select auth.uid()));
create policy own_assets on public.uploaded_assets for all to authenticated using(user_id=(select auth.uid())) with check(user_id=(select auth.uid()));
create function public.touch_entry() returns trigger language plpgsql set search_path=public as $$begin new.updated_at=clock_timestamp();return new;end$$;
create trigger entry_updated before update on public.entries for each row execute function public.touch_entry();
-- Optimistic concurrency + atomic card/history write prevent double grading across devices.
create function public.grade_card(p_id uuid,p_expected timestamptz,p_state jsonb,p_log jsonb,p_rating integer,p_due timestamptz)
returns void language plpgsql security definer set search_path=public as $$
begin
 if auth.uid() is null then raise exception 'Authentication required';end if;
 update public.entries set data=jsonb_set(data,'{schedule}',p_state) where id=p_id and user_id=auth.uid() and kind='card' and updated_at=p_expected;
 if not found then raise exception 'Card changed on another device. Reload before reviewing.';end if;
 insert into public.review_logs(user_id,card_id,rating,next_due,log) values(auth.uid(),p_id,p_rating,p_due,p_log);
end$$;
revoke all on function public.grade_card(uuid,timestamptz,jsonb,jsonb,integer,timestamptz) from public;
grant execute on function public.grade_card(uuid,timestamptz,jsonb,jsonb,integer,timestamptz) to authenticated;
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values('reading-assets','reading-assets',false,5242880,array['image/jpeg','image/png','image/webp','image/gif']) on conflict(id) do nothing;
create policy own_reading_images on storage.objects for all to authenticated using(bucket_id='reading-assets' and (storage.foldername(name))[1]=(select auth.uid())::text) with check(bucket_id='reading-assets' and (storage.foldername(name))[1]=(select auth.uid())::text);
