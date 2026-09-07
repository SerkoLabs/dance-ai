-- Shared pgTAP prerequisite for Dance AI database tests.
-- `supabase test db` runs files in lexical order against the local stack.
create extension if not exists pgtap with schema extensions;

begin;
select plan(1);
select ok(true, 'pgTAP is available');
select * from finish();
rollback;
