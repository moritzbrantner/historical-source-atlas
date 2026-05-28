# Production Readiness

This scaffold is suitable as an internal full-stack starter. For production
SaaS use, treat the checklist below as the minimum hardening baseline before
launch.

## Required Environment

- `NODE_ENV=production`
- `DATABASE_URL`
- `AUTH_SECRET`
- `SITE_URL` or `AUTH_URL`
- `EMAIL_PROVIDER`
- `EMAIL_FROM`
- `INTERNAL_CRON_SECRET`
- `IMAGE_REMOTE_HOSTS` for any external hosts rendered through `next/image`

## SMTP

Use `EMAIL_PROVIDER=smtp` for production email delivery.

Required SMTP settings:

- `SMTP_HOST`
- `SMTP_PORT`
- `SMTP_USER`
- `SMTP_PASSWORD`
- `SMTP_SECURE`

The app fails environment validation when SMTP is selected and the required
settings are incomplete.

## Object Storage

Profile images require these values together:

- `PROFILE_IMAGE_STORAGE_BUCKET`
- `PROFILE_IMAGE_STORAGE_ACCESS_KEY_ID`
- `PROFILE_IMAGE_STORAGE_SECRET_ACCESS_KEY`
- `PROFILE_IMAGE_PUBLIC_BASE_URL`

Set `PROFILE_IMAGE_STORAGE_REGION`, `PROFILE_IMAGE_STORAGE_ENDPOINT`, and
`PROFILE_IMAGE_STORAGE_FORCE_PATH_STYLE` when your storage provider requires
them. Add the public image host to `IMAGE_REMOTE_HOSTS`.

## Database Migrations

Run migrations before deploying app instances:

```bash
bun run db:migrate
bun run db:schema:generate
```

Use `bun run db:check` in CI to catch schema drift.

## Backup And Restore

Production deployments need automated PostgreSQL backups, restore drills, and a
documented recovery point objective. Verify restores into an isolated database
before relying on backups.

## Job Worker

Run a separate worker process for queued jobs:

```bash
bun run jobs:work
```

Protect internal job triggers with `INTERNAL_CRON_SECRET`.

## Admin Bootstrap

Seed or promote at least one `SUPERADMIN` before launch. Keep a documented
superadmin recovery path that uses direct database access only under incident
process controls.

## Security Checklist

- Keep the repair console superadmin-only.
- Keep role editing and user status management superadmin-only by default.
- Review `/admin/audit-log` after privileged changes.
- Configure allowed image hosts instead of wildcard image patterns.
- Use HTTPS, secure cookies, and production security headers.
- Validate mutating authenticated requests with same-origin `Origin` or
  `Referer` headers.
