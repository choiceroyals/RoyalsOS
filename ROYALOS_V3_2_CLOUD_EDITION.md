# RoyalOS V3.2 Cloud Edition

This upgrade adds a dual storage driver so the same RoyalOS source can run locally and on Vercel.

## Storage modes

Local `.env.local`:

```env
ROYALOS_STORAGE_DRIVER=local
ROYALOS_STORAGE_BUCKET=royalos-private
```

Vercel environment:

```env
ROYALOS_STORAGE_DRIVER=supabase
ROYALOS_STORAGE_BUCKET=royalos-private
SUPABASE_URL=https://YOUR_PROJECT.supabase.co
SUPABASE_SERVICE_ROLE_KEY=YOUR_SERVER_SECRET
```

## Cloud-enabled modules

- Michael P Records folders, documents, uploads and file viewing
- Plugin registry and uploaded plugin ZIP packages
- System Care logs, runtime errors and diagnostic reports
- Company PDF index and private PDF/source storage

## Production safety

Vercel deployments are immutable. The cloud System Care page therefore allows scans and diagnostic reports, but blocks file-changing operations such as npm install, cache deletion and local restore-point writes. Production rollback should use GitHub and Vercel deployment history.

Uploaded plugins remain declarative. In cloud mode their ZIP packages are validated and stored in Supabase rather than extracted into the deployed application directory.

## Supabase bucket

Create a private bucket named `royalos-private`. A service-role server client performs storage operations. Do not expose `SUPABASE_SERVICE_ROLE_KEY` to browser code.

## Existing local data

This package does not automatically upload files already present in local `data/` or `.royalos-*` folders. New cloud records will be persistent across devices. A migration/import tool can be added later for old local records and plugin packages.
