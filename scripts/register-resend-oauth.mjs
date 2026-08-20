#!/usr/bin/env node
/**
 * Register Doloyal as a Resend OAuth client using Dynamic Client Registration
 * (DCR). Resend returns a client_id that must be stored in the API's
 * RESEND_OAUTH_CLIENT_ID environment variable.
 *
 * Usage:
 *   node scripts/register-resend-oauth.mjs [--app-url https://www.doloyal.com]
 *
 * The app URL defaults to https://www.doloyal.com. Use
 * `--app-url http://localhost:3000` for local development. The registered
 * redirect URI(s) must match the callback page exactly, otherwise the
 * authorization flow will reject the callback.
 */

const DCR_ENDPOINT = 'https://api.resend.com/oauth/register';
const DEFAULT_APP_URL = 'https://www.doloyal.com';

function parseArgs(argv) {
  const args = { appUrl: DEFAULT_APP_URL };
  for (let i = 2; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--app-url' && argv[i + 1]) {
      args.appUrl = argv[i + 1].replace(/\/$/, '');
      i += 1;
    } else if (arg === '--help' || arg === '-h') {
      args.help = true;
    }
  }
  return args;
}

const { appUrl, help } = parseArgs(process.argv);

if (help) {
  console.log(
    [
      'Register Doloyal as a Resend OAuth client (Dynamic Client Registration).',
      '',
      'Usage:',
      '  node scripts/register-resend-oauth.mjs [--app-url <url>]',
      '',
      'Options:',
      '  --app-url  Base URL of the app. Defaults to https://www.doloyal.com.',
      '             Use http://localhost:3000 for local development.',
      '',
    ].join('\n'),
  );
  process.exit(0);
}

const redirectUris = [`${appUrl}/app/integrations/callback`];

const clientMetadata = {
  client_name: 'Doloyal',
  redirect_uris: redirectUris,
  grant_types: ['authorization_code', 'refresh_token'],
  response_types: ['code'],
  token_endpoint_auth_method: 'none',
  scope: 'emails:send',
};

async function main() {
  console.log(`Registering Resend OAuth client for app URL: ${appUrl}`);
  console.log(`Redirect URI(s): ${redirectUris.join(', ')}`);
  console.log('POST', DCR_ENDPOINT);

  const res = await fetch(DCR_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(clientMetadata),
  });

  const body = await res.json().catch(() => ({}));

  if (!res.ok) {
    console.error(`\nRegistration failed (${res.status}):`);
    console.error(JSON.stringify(body, null, 2));
    process.exit(1);
  }

  const clientId = body.client_id;
  if (!clientId) {
    console.error('\nNo client_id returned by Resend. Raw response:');
    console.error(JSON.stringify(body, null, 2));
    process.exit(1);
  }

  console.log('\nRegistration successful.');
  console.log('client_id:', clientId);
  console.log('\nAdd this to your API environment (.env):');
  console.log(`RESEND_OAUTH_CLIENT_ID="${clientId}"`);
  console.log('\nNo client_secret is needed — Resend uses public clients (PKCE).');
}

main().catch((err) => {
  console.error('Unexpected error:', err.message);
  process.exit(1);
});