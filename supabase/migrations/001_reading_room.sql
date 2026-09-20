-- Run once in Supabase SQL Editor. All application operations use the signed-in role.
create table public.records (
 id uuid primary key, user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
 kind text not null check(kind in ('book','article','chapter','vocabulary','card','practice')),
 title text not null check(length(trim(title)) between 1 and 500), language text not null check(language in ('en','fr')),
 parent_id uuid, position integer not null default 0 check(position>=0), data jsonb not null default '{}' check(jsonb_typeof(data)='object'),
 version integer not null default 1 check(version>0), deleted_at timestamptz,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 unique(id,user_id), constraint owned_parent foreign key(parent_id,user_id) references public.records(id,user_id) deferrable initially deferred,
 check(parent_id is distinct from id), check(kind<>'chapter' or parent_id is not null)
);
create index records_owner_updated on public.records(user_id,updated_at desc);
create index records_owner_parent on public.records(user_id,parent_id);
create index records_kind on public.records(user_id,kind) where deleted_at is null;
create table public.review_events (
 id uuid primary key, user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
 card_id uuid not null, rating text not null check(rating in ('again','hard','good','easy')),
 reviewed_at timestamptz not null default now(), next_due timestamptz not null,
 foreign key(card_id,user_id) references public.records(id,user_id) deferrable initially deferred
);
create index review_events_owner on public.review_events(user_id,reviewed_at desc);
alter table public.records enable row level security;
alter table public.review_events enable row level security;
create policy own_records on public.records for all to authenticated using ((select auth.uid())=user_id) with check((select auth.uid())=user_id);
create policy own_events on public.review_events for all to authenticated using ((select auth.uid())=user_id) with check((select auth.uid())=user_id);
revoke all on public.records,public.review_events from authenticated;
grant select,insert,update on public.records to authenticated;
grant select,insert on public.review_events to authenticated;
revoke all on public.records,public.review_events from anon;

create function public.validate_parent() returns trigger language plpgsql set search_path=public as $$
declare pk text;
begin
 if new.parent_id is not null then
  select kind into pk from records where id=new.parent_id and user_id=new.user_id;
  if pk is null then raise exception 'Source is unavailable or belongs to another account'; end if;
  if new.kind='chapter' and pk<>'book' then raise exception 'Chapters must belong to a book'; end if;
  if new.kind in ('book','article') then raise exception 'Library entries cannot have a parent'; end if;
  if new.kind='vocabulary' and pk not in ('book','article','chapter') then raise exception 'Invalid vocabulary source'; end if;
  if new.kind='practice' and pk not in ('book','article','chapter') then raise exception 'Invalid practice source'; end if;
  if new.kind='card' and pk not in ('book','article','chapter','vocabulary') then raise exception 'Invalid card source'; end if;
 end if;
 return new;
end $$;
create constraint trigger validate_owned_parent after insert or update on public.records deferrable initially deferred for each row execute function public.validate_parent();

create function public.save_record(item jsonb,expected_version integer) returns jsonb language plpgsql security invoker set search_path=public as $$
declare result records;
begin
 if auth.uid() is null then raise exception 'Sign in required'; end if;
 if expected_version=0 then
 insert into records(id,kind,title,language,parent_id,position,data,deleted_at)
 values((item->>'id')::uuid,item->>'kind',item->>'title',item->>'language',(item->>'parent_id')::uuid,coalesce((item->>'position')::int,0),item->'data',(item->>'deleted_at')::timestamptz) returning * into result;
 else
 update records set title=item->>'title',language=item->>'language',parent_id=(item->>'parent_id')::uuid,position=(item->>'position')::int,data=item->'data',deleted_at=(item->>'deleted_at')::timestamptz,version=version+1,updated_at=now()
 where id=(item->>'id')::uuid and user_id=auth.uid() and version=expected_version and kind=item->>'kind' returning * into result;
 if not found then raise exception 'Save conflict: this record changed on another device. Your draft is preserved. Reload the saved version or copy your draft before continuing.'; end if;
 end if;
 return to_jsonb(result);
end $$;

create function public.review_card(card uuid,attempt uuid,expected_version integer,grade text) returns jsonb language plpgsql security invoker set search_path=public as $$
declare r records; days integer; due_at timestamptz;
begin
 if exists(select 1 from review_events where id=attempt and user_id=auth.uid()) then
 return (select to_jsonb(records) from records where id=card and user_id=auth.uid()); end if;
 select * into r from records where id=card and user_id=auth.uid() and kind='card' and deleted_at is null for update;
 if not found then raise exception 'Card unavailable'; end if;
 if exists(select 1 from review_events where id=attempt and card_id=card and user_id=auth.uid()) then return to_jsonb(r); end if;
 if r.version<>expected_version then raise exception 'This card has already changed. Reload the review queue.'; end if;
 if coalesce((r.data->>'paused')::boolean,false) then raise exception 'This card is paused'; end if;
 days:=coalesce((r.data->>'interval')::integer,0);
 days:=case grade when 'again' then 0 when 'hard' then greatest(1,round(days*1.2)::integer) when 'good' then greatest(2,round(days*2.5)::integer) when 'easy' then greatest(4,round(days*3.5)::integer) else null end;
 if days is null then raise exception 'Invalid recall rating'; end if;
 days:=least(days,36500);
 due_at:=now()+case when days=0 then interval '10 minutes' else make_interval(days=>days) end;
 insert into review_events(id,card_id,rating,next_due) values(attempt,card,grade,due_at);
 update records set data=data||jsonb_build_object('interval',days,'due',to_char(due_at at time zone 'UTC','YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')),version=version+1,updated_at=now() where id=card and user_id=auth.uid() returning * into r;
 return to_jsonb(r);
end $$;

create function public.export_backup() returns jsonb language sql security invoker set search_path=public as $$
 select jsonb_build_object('format','reading-room','version',1,'exportedAt',to_char(now() at time zone 'UTC','YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),'records',coalesce((select jsonb_agg(to_jsonb(r)-'user_id') from records r where user_id=auth.uid()),'[]'::jsonb),'events',coalesce((select jsonb_agg(jsonb_build_object('id',id,'card_id',card_id,'rating',rating,'reviewed_at',to_char(reviewed_at at time zone 'UTC','YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),'next_due',to_char(next_due at time zone 'UTC','YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'))) from review_events where user_id=auth.uid()),'[]'::jsonb));
$$;

create function public.import_backup(backup jsonb) returns jsonb language plpgsql security invoker set search_path=public as $$
declare item jsonb; added integer:=0; skipped integer:=0;
begin
 if auth.uid() is null then raise exception 'Sign in required'; end if;
 if backup->>'format'<>'reading-room' or backup->>'version'<>'1' then raise exception 'Invalid backup'; end if;
 for item in select value from jsonb_array_elements(backup->'records') loop
  if exists(select 1 from records where id=(item->>'id')::uuid and user_id=auth.uid()) then skipped:=skipped+1;
  else
   insert into records(id,kind,title,language,parent_id,position,data,version,deleted_at,created_at,updated_at)
   values((item->>'id')::uuid,item->>'kind',item->>'title',item->>'language',(item->>'parent_id')::uuid,(item->>'position')::int,item->'data',(item->>'version')::int,(item->>'deleted_at')::timestamptz,coalesce((item->>'created_at')::timestamptz,now()),coalesce((item->>'updated_at')::timestamptz,now()));added:=added+1;
  end if;
 end loop;
 for item in select value from jsonb_array_elements(backup->'events') loop
  if not exists(select 1 from review_events where id=(item->>'id')::uuid and user_id=auth.uid()) then
   insert into review_events(id,card_id,rating,reviewed_at,next_due) values((item->>'id')::uuid,(item->>'card_id')::uuid,item->>'rating',(item->>'reviewed_at')::timestamptz,(item->>'next_due')::timestamptz);
  end if;
 end loop;
 return jsonb_build_object('added',added,'skipped',skipped);
end $$;
revoke execute on function public.save_record(jsonb,integer),public.review_card(uuid,uuid,integer,text),public.export_backup(),public.import_backup(jsonb) from public,anon;
grant execute on function public.save_record(jsonb,integer),public.review_card(uuid,uuid,integer,text),public.export_backup(),public.import_backup(jsonb) to authenticated;

create function public.review_summary() returns jsonb language sql security invoker set search_path=public as $$
 select jsonb_build_object('vocabularyReviewed',count(distinct v.id),'attempts',count(e.id)) from review_events e join records c on c.id=e.card_id and c.user_id=e.user_id join records v on v.id=c.parent_id and v.user_id=c.user_id and v.kind='vocabulary' where e.user_id=auth.uid();
$$;
revoke execute on function public.review_summary() from public,anon;
grant execute on function public.review_summary() to authenticated;
