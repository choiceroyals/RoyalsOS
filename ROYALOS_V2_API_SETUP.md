# RoyalOS V2 API Setup

Add missing values to your existing `.env.local`. Never replace the file or commit it to Git.

## Premium audio and voice cloning
ELEVENLABS_API_KEY=
ELEVENLABS_DEFAULT_VOICE_ID=
ELEVENLABS_TTS_MODEL=eleven_flash_v2_5
IFEOLUWA_ELEVENLABS_VOICE_ID=

## Standard CapCut provider
The adapter is intentionally disabled until official API documentation and an endpoint contract are available.
CAPCUT_API_ENABLED=false
CAPCUT_API_BASE_URL=
CAPCUT_API_KEY=
CAPCUT_CLIENT_ID=
CAPCUT_CLIENT_SECRET=

## Cine limits
CINE_MAX_VIDEO_DURATION_SECONDS=300
CINE_MAX_AUDIO_DURATION_SECONDS=7200
CINE_STANDARD_AUDIO_PROVIDER=capcut
CINE_PREMIUM_AUDIO_PROVIDER=elevenlabs

## Existing providers
OPENAI_API_KEY=
RUNWAYML_API_SECRET=
HEYGEN_API_KEY=
GOOGLE_GENERATIVE_AI_API_KEY=

## Required database migration
Run the migrations in `supabase/migrations` in date order. The missing `public.royalos_company_records` warning is fixed by running `20260714_orion_company_records.sql` after `20260714_core_operations_foundation.sql`.
