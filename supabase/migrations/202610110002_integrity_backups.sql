-- Enforce a directed ownership hierarchy, including writes made directly through the Data API.
create function public.validate_entry_parent() returns trigger language plpgsql set search_path=public as $$
declare parent_kind text;
begin
 if new.parent_id is null then
  if new.kind='chapter' then raise exception 'A chapter must belong to a book';end if;
  return new;
 end if;
 select kind into parent_kind from entries where id=new.parent_id and workspace_id=new.workspace_id and user_id=new.user_id;
 if parent_kind is null then raise exception 'Source does not belong to this workspace';end if;
 if new.kind in ('book','article','journal') then raise exception 'Reading items and journal entries cannot be nested';end if;
 if new.kind='chapter' and parent_kind<>'book' then raise exception 'Chapters must belong to books';end if;
 if new.kind in ('note','vocabulary','quote','action') and parent_kind not in ('book','article','chapter') then raise exception 'Choose a book, article, or chapter as the source';end if;
 if new.kind='card' and parent_kind not in ('book','article','chapter','note','vocabulary','quote','journal') then raise exception 'Invalid card source';end if;
 return new;
end$$;
create trigger validate_entry_parent before insert or update on public.entries for each row execute function public.validate_entry_parent();
create function public.export_library() returns jsonb language sql security invoker set search_path=public as $$
select jsonb_build_object('version',1,'exported_at',now(),'workspaces',coalesce((select jsonb_agg(to_jsonb(w)) from workspaces w),'[]'),'entries',coalesce((select jsonb_agg(to_jsonb(e)) from entries e),'[]'),'reviews',coalesce((select jsonb_agg(to_jsonb(r)) from review_logs r),'[]'));
$$;
create function public.import_library(backup jsonb) returns jsonb language plpgsql security definer set search_path=public as $$
declare w jsonb; e jsonb; r jsonb; pending jsonb; remaining jsonb; inserted integer:=0; skipped integer:=0; changed boolean;
begin
 if auth.uid() is null then raise exception 'Authentication required';end if;
 if (backup->>'version')::integer<>1 then raise exception 'Unsupported backup version';end if;
 for w in select value from jsonb_array_elements(backup->'workspaces') loop
  if exists(select 1 from workspaces where id=(w->>'id')::uuid and user_id<>auth.uid()) then raise exception 'Workspace belongs to another account';end if;
  insert into workspaces(id,user_id,name,language,color,icon) values((w->>'id')::uuid,auth.uid(),w->>'name',w->>'language',w->>'color',w->>'icon') on conflict(id) do nothing;
 end loop;
 pending:=backup->'entries';
 while jsonb_array_length(pending)>0 loop
  remaining:='[]';changed:=false;
  for e in select value from jsonb_array_elements(pending) loop
   if exists(select 1 from entries where id=(e->>'id')::uuid) then
    if not exists(select 1 from entries where id=(e->>'id')::uuid and user_id=auth.uid()) then raise exception 'Entry belongs to another account';end if;
    skipped:=skipped+1;changed:=true;
   elsif e->>'parent_id' is null or exists(select 1 from entries where id=(e->>'parent_id')::uuid and user_id=auth.uid()) then
    insert into entries(id,user_id,workspace_id,parent_id,kind,title,data,created_at) values((e->>'id')::uuid,auth.uid(),(e->>'workspace_id')::uuid,(e->>'parent_id')::uuid,e->>'kind',e->>'title',e->'data',coalesce((e->>'created_at')::timestamptz,now()));inserted:=inserted+1;changed:=true;
   else remaining:=remaining||jsonb_build_array(e);end if;
  end loop;
  if not changed then raise exception 'Backup has missing or cyclic source relationships';end if;pending:=remaining;
 end loop;
 for r in select value from jsonb_array_elements(coalesce(backup->'reviews','[]')) loop
  if not exists(select 1 from entries where id=(r->>'card_id')::uuid and user_id=auth.uid() and kind='card') then raise exception 'Review card missing';end if;
  insert into review_logs(id,user_id,card_id,rating,reviewed_at,next_due,log) values((r->>'id')::uuid,auth.uid(),(r->>'card_id')::uuid,(r->>'rating')::integer,(r->>'reviewed_at')::timestamptz,(r->>'next_due')::timestamptz,r->'log') on conflict(id) do nothing;
 end loop;
 return jsonb_build_object('inserted',inserted,'skipped',skipped);
end$$;
revoke all on function public.import_library(jsonb) from public;
revoke all on function public.export_library() from public;
grant execute on function public.import_library(jsonb) to authenticated;
grant execute on function public.export_library() to authenticated;
grant select,insert,update,delete on public.workspaces,public.entries,public.uploaded_assets to authenticated;
grant select on public.review_logs to authenticated;
