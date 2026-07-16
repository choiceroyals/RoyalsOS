# RoyalOS Brand Switcher Hydration Fix

Fixed a React hydration mismatch caused by reading the selected brand from browser localStorage during the first client render while the server rendered the default ChoiceRoyals brand.

## Updated files
- `lib/brands/client.ts`
- `components/dashboard/BrandSwitcher.tsx`
- `components/dashboard/BrandOperationsCenter.tsx`

## Behavior
- Server and first client render now use the same deterministic ChoiceRoyals seed.
- After hydration, the saved brand selection is restored from localStorage.
- Existing brand selections and saved brand operations data remain intact.

## Validation
- `npx tsc --noEmit` passed.
- Next.js production compilation and TypeScript build stages passed.
