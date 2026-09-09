# Security Policy

## Supported versions

This project is actively developed on the `main` branch and is deployed continuously to production.
There are **no tagged releases** yet, so the only supported version is the latest commit on `main`.

Security fixes land on `main` and are deployed as part of the normal release flow.

## Reporting a vulnerability

If you find a security issue, **please do not open a public issue.**

- Report it privately through GitHub's **Security → Report a vulnerability** on this repository
  (private vulnerability reporting).
- Provide a minimal reproduction, the affected endpoint/component, and the impact if possible.

The maintainer will acknowledge the report and coordinate a fix. If you prefer email, the maintainer can be
reached via their GitHub profile. Public disclosure after a fix is released is welcome and appreciated.

## Security model

This application is **fully anonymous** — there are no user accounts and no user data is stored server-side.
The only privileged surface is a **local admin login** used to trigger on-demand data refreshes.

### Public surface (unauthenticated)

- `GET /` (landing), `GET /app` (calculator), `GET /sitemap.xml`, `GET /robots.txt`
- `GET /api/models` and `GET /api/gpu-prices` — return **cached database rows only**.
  Users can never force a refresh; there is no refresh button exposed to them.

### Admin surface (authenticated)

- `POST /api/admin/login` — local username/password login issuing a signed JWT cookie.
- `POST /api/models/refresh`, `POST /api/gpu-prices/refresh` — guarded by the admin session.
- `SESSION_SECRET` signs the JWT. If unset, a random per-boot secret is generated, which invalidates sessions on
  restart — **always set `SESSION_SECRET` in production**.
- The server runs behind a reverse proxy with `trust proxy: true`; the admin brute-force lockout relies on the
  real client IP (see hardening below).

### Privacy (KVKK)

- No accounts, no emails, no analytics, no server-side user data. Saved scenarios and language preferences live
  in the user's browser (`localStorage`) only.
- The admin login exists solely for catalog/price maintenance; credentials come from environment variables.

## Hardening checklist (production)

Follow these when deploying:

- [ ] Set a strong, random `SESSION_SECRET` (`openssl rand -base64 32`).
- [ ] Set `ADMIN_USERNAME` / `ADMIN_PASSWORD` to unique values, not the `.env.example` defaults.
- [ ] Set a strong `POSTGRES_PASSWORD`; never reuse the example value.
- [ ] Terminate TLS at the reverse proxy (nginx + certbot) and enforce HTTPS; the app itself binds to
      `127.0.0.1` in the Docker deployment.
- [ ] Keep the admin endpoint out of public reach unless intended; the admin login already has a per-IP
      brute-force lockout.
- [ ] For any non-local Postgres host, the app auto-enables SSL unless `?sslmode=` is present in `DATABASE_URL`
      (internal plain-Postgres hosts must use `?sslmode=disable`; external hosts should keep SSL on).
- [ ] Keep dependencies updated: run `npm audit` / `npm update` on a schedule and review major bumps.
- [ ] Use a recent Node.js LTS and current Postgres images in production (see `Dockerfile`,
      `docker-compose.yml`).

## Scope / out of scope

- **In scope:** the Express server and its routes, admin auth, DB-backed endpoints, price/model refresh flows,
  the Python scrapers, and the production Docker/nginx deployment.
- **Out of scope:** third-party services this app integrates with (Hugging Face Hub, RunPod, Lambda, Modal) —
  report issues with those services to their respective vendors.

## Dependencies

Dependencies are pinned in `package-lock.json`. Review `npm audit` output before each release. The scrapers run
via `uv` with `scripts/scraper/requirements.txt` pinned in `.venv`.