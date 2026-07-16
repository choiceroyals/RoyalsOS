# RoyalOS V3 — Nova Reference Image & Asset Persistence Fix

## Fixed

1. **Nova Studio now displays an obvious “+ Add picture for generation” button.**
   - Supports PNG, JPG/JPEG, and WebP.
   - Supports up to 8 reference images per generation.
   - Uses `/api/nova/reference-generate` and OpenAI image editing.
   - Reference files are preserved as uploaded assets.

2. **Asset Gallery no longer replaces the current list with a smaller server response.**
   - Merges in-memory assets, Supabase asset records, and local RoyalOS asset records.
   - Removes duplicates and sorts newest first.
   - If Supabase is temporarily unavailable, local assets still load.

3. **New text-generated Nova images receive a stable local mirror.**
   - Supabase remains the cloud record.
   - A local copy is written to `public/royalos-assets/generated` and indexed in `public/royalos-assets/index.json`.
   - This prevents images from disappearing because a signed URL expired or a database request returned fewer records.

4. **npm lockfile registry corrected.**
   - Removed build-environment-only package URLs.
   - Uses `https://registry.npmjs.org/` so Windows installation works normally.

## Important when applying the patch

Do not delete your existing `public/royalos-assets` folder or `.env.local` file. They contain local generated/uploaded assets and credentials.

After copying the files, restart RoyalOS:

```bat
Ctrl + C
npm run dev
```

If dependencies are missing:

```bat
npm install --registry=https://registry.npmjs.org/
npm run dev
```
