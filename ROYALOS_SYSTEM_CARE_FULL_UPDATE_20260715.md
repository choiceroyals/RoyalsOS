# RoyalOS System Care Full Update — 2026-07-15

## Purpose

This package consolidates the latest RoyalOS brand connections, website registry, Cine approval/generation workflow, Security & Audit Center, and the new local System Care repair engine.

## New System Care page

The sidebar and top status button now open **System Care & Software Update**.

System Care can:

- Run a quick configuration and file scan.
- Capture browser errors and unhandled promise failures automatically.
- Verify TypeScript and ESLint with a strict command allowlist.
- Clear the safe Next.js cache.
- Repair missing dependencies with `npm install` after a direct user click.
- Create source-code restore points before upgrades.
- Generate diagnostic reports in `.royalos/reports`.
- Assign software issues directly to Orion.
- Create and assign a security incident directly to Sentinel.
- Maintain an action audit trail in `.royalos/system-maintenance-log.json`.

System Care never reads or displays secret values from `.env.local`.

## Sentinel repair

All Sentinel assignment buttons now perform a real action:

- Alert assignment creates or opens an incident.
- Platform Health assignment creates an incident.
- Brand website assignment creates a Security & Audit incident.
- The interface confirms that Sentinel accepted the work.

## Safety

- System Care write actions are local-only by default.
- Set `ROYALOS_ALLOW_REMOTE_SYSTEM_CARE=true` only on a trusted private network.
- Rollback is not automatic.
- Production code changes remain approval-controlled through Orion.
- `.env.local`, API secrets, passwords, and tokens are excluded from this package.

## Validation

- TypeScript passed.
- ESLint completed with zero errors.
- Next.js production compilation completed successfully.
- Dashboard returned HTTP 200.
- `/api/system/maintenance` returned a valid connected snapshot.
