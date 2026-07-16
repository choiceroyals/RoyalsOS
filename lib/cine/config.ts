export const CINE_VIDEO_TYPES = [
  "Social media video",
  "Business advertisement",
  "Music video",
  "Lyric video",
  "Talking presenter",
  "Product demonstration",
  "Educational video",
  "Cinematic story",
] as const;

export type CineVideoType =
  (typeof CINE_VIDEO_TYPES)[number];

export const CINE_ASPECT_RATIOS = [
  { value: "9:16", label: "Vertical — Reels, TikTok, Shorts" },
  { value: "16:9", label: "Widescreen — YouTube and presentations" },
  { value: "1:1", label: "Square — Social feeds" },
] as const;

export const CINE_BUDGET_MODES = [
  {
    value: "Economy",
    description:
      "Uses images, motion, narration, captions, and limited generated clips.",
  },
  {
    value: "Balanced",
    description:
      "Combines true AI video clips with images, voice, captions, and editing.",
  },
  {
    value: "Premium",
    description:
      "Prioritizes premium cinematic video generation and additional scene attempts.",
  },
] as const;

export type CineBudgetMode =
  (typeof CINE_BUDGET_MODES)[number]["value"];

export const CINE_PROVIDER_DIRECTORY = [
  {
    id: "openai",
    name: "OpenAI",
    purpose: "Creative direction, scripts, storyboards, prompts, images, audio, and supported video models.",
    envKeys: ["OPENAI_API_KEY"],
  },
  {
    id: "heygen",
    name: "HeyGen",
    purpose: "Talking presenters, avatars, digital twins, lip sync, and translated presenter videos.",
    envKeys: ["HEYGEN_API_KEY"],
  },
  {
    id: "runway",
    name: "Runway",
    purpose: "Text-to-video, image-to-video, transformations, effects, and upscaling.",
    envKeys: ["RUNWAYML_API_SECRET|RUNWAY_API_KEY"],
  },
  {
    id: "veo",
    name: "Google Veo",
    purpose: "Premium cinematic generation, realistic movement, sound, and dialogue workflows.",
    envKeys: ["GOOGLE_GENERATIVE_AI_API_KEY"],
  },
  {
    id: "elevenlabs",
    name: "ElevenLabs",
    purpose: "Optional premium narration, character voices, dubbing, and sound generation.",
    envKeys: ["ELEVENLABS_API_KEY"],
  },
  {
    id: "ffmpeg",
    name: "RoyalOS FFmpeg Renderer",
    purpose: "Assembly, captions, branding, transitions, audio mixing, resizing, and final export.",
    envKeys: [],
  },
] as const;

export type CineProviderId =
  (typeof CINE_PROVIDER_DIRECTORY)[number]["id"];

export type CineProductionRequest = {
  prompt: string;
  workspace: string;
  videoType: CineVideoType;
  aspectRatio: "9:16" | "16:9" | "1:1";
  durationSeconds: number;
  budgetMode: CineBudgetMode;
  presenterRequired: boolean;
  voiceoverRequired: boolean;
  captionsRequired: boolean;
  brandLogoRequired: boolean;
};
