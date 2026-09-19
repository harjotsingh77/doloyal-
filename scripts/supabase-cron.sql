-- Doloyal serverless scheduler for Vercel Hobby.
--
-- Before running:
--   1. Replace the two placeholder values below.
--   2. Run this file in Supabase SQL Editor as the project owner.
--
-- The API still takes expiring database-backed leases, so a delayed/overlapping
-- invocation cannot dispatch the same class of job twice.

create extension if not exists pg_cron;
create extension if not exists pg_net with schema extensions;
create extension if not exists supabase_vault;

select vault.create_secret(
  'https://YOUR-API-PROJECT.vercel.app',
  'doloyal_backend_url',
  'Canonical Doloyal NestJS API origin'
);

select vault.create_secret(
  'REPLACE-WITH-THE-SAME-CRON_SECRET-AS-VERCEL',
  'doloyal_cron_secret',
  'Bearer token for Doloyal internal cron endpoints'
);

create or replace function public.invoke_doloyal_cron(job_path text)
returns bigint
language plpgsql
security definer
set search_path = public, extensions, vault
as $$
declare
  backend_url text;
  cron_secret text;
  request_id bigint;
begin
  select decrypted_secret
    into backend_url
    from vault.decrypted_secrets
   where name = 'doloyal_backend_url'
   order by created_at desc
   limit 1;

  select decrypted_secret
    into cron_secret
    from vault.decrypted_secrets
   where name = 'doloyal_cron_secret'
   order by created_at desc
   limit 1;

  if backend_url is null or cron_secret is null then
    raise exception 'Doloyal cron Vault secrets are missing';
  end if;

  select net.http_get(
    url := rtrim(backend_url, '/') || job_path,
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || cron_secret,
      'User-Agent', 'supabase-cron/doloyal'
    ),
    timeout_milliseconds := 25000
  )
  into request_id;

  return request_id;
end;
$$;

revoke all on function public.invoke_doloyal_cron(text) from public;

select cron.schedule(
  'doloyal-campaigns',
  '* * * * *',
  $$select public.invoke_doloyal_cron('/internal/cron/campaigns');$$
);
select cron.schedule(
  'doloyal-workflows',
  '* * * * *',
  $$select public.invoke_doloyal_cron('/internal/cron/workflows');$$
);
select cron.schedule(
  'doloyal-referral-leaderboards',
  '*/2 * * * *',
  $$select public.invoke_doloyal_cron('/internal/cron/referrals/leaderboards');$$
);
select cron.schedule(
  'doloyal-referral-rewards',
  '*/3 * * * *',
  $$select public.invoke_doloyal_cron('/internal/cron/referrals/pending-rewards');$$
);
select cron.schedule(
  'doloyal-referral-campaign-expiry',
  '*/5 * * * *',
  $$select public.invoke_doloyal_cron('/internal/cron/referrals/expire-campaigns');$$
);
select cron.schedule(
  'doloyal-referral-sources',
  '*/5 * * * *',
  $$select public.invoke_doloyal_cron('/internal/cron/referrals/aggregate-sources');$$
);
select cron.schedule(
  'doloyal-referral-link-expiry',
  '*/10 * * * *',
  $$select public.invoke_doloyal_cron('/internal/cron/referrals/expire-links');$$
);
select cron.schedule(
  'doloyal-referral-fraud',
  '*/15 * * * *',
  $$select public.invoke_doloyal_cron('/internal/cron/referrals/fraud-scan');$$
);
select cron.schedule(
  'doloyal-appointment-reminders',
  '0 * * * *',
  $$select public.invoke_doloyal_cron('/internal/cron/appointments');$$
);

-- Verify registrations:
-- select jobname, schedule, active from cron.job where jobname like 'doloyal-%';
--
-- Inspect HTTP responses:
-- select id, status_code, content, error_msg
-- from net._http_response
-- order by created desc
-- limit 25;
