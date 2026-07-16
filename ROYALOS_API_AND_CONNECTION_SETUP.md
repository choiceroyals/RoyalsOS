# RoyalOS API and Connection Setup

This build contains the brand-aware connection registry, OAuth start/callback routes, encrypted Supabase credential vault support, separate Metricool records per brand, employee permissions, connection audit events, publishing queues, and connection-health UI.

Real connections require provider developer accounts, credentials, approved permissions, and a public HTTPS URL for production. Localhost may be used only where the provider permits it.

## Required first

1. `ROYALOS_PUBLIC_URL`
2. `ROYALOS_CREDENTIAL_ENCRYPTION_KEY`
3. `ROYALOS_SECURITY_INGEST_SECRET` for production webhook/log ingestion
4. Supabase URL, anon/publishable key, and service-role key
5. Run the included migration: `supabase/migrations/20260715_brand_identity_security_foundation.sql`

Generate the encryption key locally:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

Never share that key. Losing it means stored OAuth credentials cannot be decrypted.

## OAuth callback URLs

Use your production RoyalOS domain instead of `http://localhost:3000` when deployed.

```text
Meta:     http://localhost:3000/api/integrations/oauth/callback/meta
Google:   http://localhost:3000/api/integrations/oauth/callback/google
LinkedIn: http://localhost:3000/api/integrations/oauth/callback/linkedin
X:        http://localhost:3000/api/integrations/oauth/callback/x
TikTok:   http://localhost:3000/api/integrations/oauth/callback/tiktok
GitHub:   http://localhost:3000/api/integrations/oauth/callback/github
```

## Provider checklist

### Meta — Facebook and Instagram

Add:

```text
META_APP_ID
META_APP_SECRET
META_GRAPH_API_VERSION
META_OAUTH_SCOPES (optional override)
```

Create a Meta developer app, configure Facebook Login for Business / Instagram professional-account access, register the callback, request only the permissions needed, and complete provider review when required. Each brand authorizes its own Page and Instagram professional account.

### Google — YouTube, Gmail, Drive, Calendar

Add:

```text
GOOGLE_CLIENT_ID
GOOGLE_CLIENT_SECRET
```

Create a Google Cloud project, enable the needed APIs, configure the OAuth consent screen, and register the callback. Each brand completes consent separately so RoyalOS receives a separate refresh token/account grant.

### LinkedIn

Add:

```text
LINKEDIN_CLIENT_ID
LINKEDIN_CLIENT_SECRET
LINKEDIN_OAUTH_SCOPES (optional; request only scopes approved for the app)
```

Create a LinkedIn developer app and register the callback. Posting uses member authorization. Organization/marketing permissions may require LinkedIn approval.

### X

Add:

```text
X_CLIENT_ID
X_CLIENT_SECRET
```

Create an X developer app, enable OAuth 2.0, register the callback, and request user-context scopes. RoyalOS uses Authorization Code with PKCE and requests offline access for refresh tokens.

### TikTok

Add:

```text
TIKTOK_CLIENT_KEY
TIKTOK_CLIENT_SECRET
```

Register a TikTok developer app, enable Login Kit and the Content Posting API, verify the redirect URI/domain, and complete review for production publishing permissions.

### GitHub

Add:

```text
GITHUB_CLIENT_ID
GITHUB_CLIENT_SECRET
```

Create a GitHub OAuth App and register the callback. Keep repository scopes limited. Orion still requires CEO approval for writes, merges, deployments, deletion, or secret changes.

### WordPress (self-hosted)

WordPress uses per-brand Application Passwords over HTTPS in this build rather than copying a normal admin password.

```text
<BRAND>_WORDPRESS_SITE_URL
<BRAND>_WORDPRESS_USERNAME
<BRAND>_WORDPRESS_APPLICATION_PASSWORD
```

Generate the Application Password from the WordPress user profile. Use a dedicated least-privilege user for RoyalOS.

### Metricool — separate per brand

Each brand uses its own token/IDs:

```text
<BRAND>_METRICOOL_API_TOKEN
<BRAND>_METRICOOL_USER_ID
<BRAND>_METRICOOL_BLOG_ID
```

Metricool API access is plan-dependent. The current official help documentation says API access is available on Advanced and Custom plans. One Metricool account may contain several Metricool brands, but RoyalOS preserves separate connection records for ChoiceRoyals, Xena Grace, TD Talk, and Triple-Hay.

### Stripe

```text
<BRAND>_STRIPE_SECRET_KEY
```

Use restricted keys where possible. Add webhook signing secrets when payment-event ingestion is implemented. Michael P receives read/report access; refunds, transfers, payout changes, and billing changes require CEO approval.

### Printful

```text
<BRAND>_PRINTFUL_API_TOKEN
```

Use a separate store/token mapping for each brand where appropriate.

### Supabase

```text
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY or NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
SUPABASE_SERVICE_ROLE_KEY
```

The service-role key must remain server-only. Apply authentication and organization membership before public multi-company use.


### Sentinel security-event ingestion

Add in production:

```text
ROYALOS_SECURITY_INGEST_SECRET
```

External website, WordPress, webhook, hosting, payment, and security connectors should send this value as either `Authorization: Bearer <secret>` or `x-royalos-ingest-secret`. The ingestion route validates events and stores them in Supabase when the migration and service-role key are configured. Never place the secret in client-side JavaScript.

### AI/video providers

```text
OPENAI_API_KEY
GOOGLE_GENERATIVE_AI_API_KEY
HEYGEN_API_KEY
RUNWAY_API_KEY
ELEVENLABS_API_KEY
```

Cine can route providers only after their adapters are connected. API balances are separate by provider.

## What is already connected in code

- Brand Directory and full brand profiles
- Premium ChoiceRoyals identity and logo placement
- Global brand switcher
- Per-brand platform and website registries
- Separate Metricool configuration per brand
- OAuth URL generation and callbacks for Meta, Google, LinkedIn, X, TikTok, and GitHub
- AES-256-GCM credential encryption
- Supabase credential-vault schema
- Employee permissions and direct assignment
- Brand publishing queue and audit trail
- Sentinel Security & Audit Center
- Security-event ingestion foundation
- Curated senior employees on the dashboard and full Employee Directory
- Collapsible/private Ifeoluwa dashboard panel

## What still depends on provider authorization

RoyalOS cannot truthfully mark a platform live until you create the provider app, add credentials, approve the requested scopes, complete OAuth, and pass any provider review. Publishing and analytics adapters must also be tested platform by platform before autonomous posting is enabled.
