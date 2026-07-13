import "server-only";

import {
  getRoyalOSToolDefinition,
  isRoyalOSToolRegistered,
  registerRoyalOSTool,
} from "@/lib/tools/registry";

import {
  generateRoyalOSImage,
  type RoyalOSImageGenerationInput,
  type RoyalOSImageGenerationOutput,
} from "@/lib/tools/connectors/openai-images";

import type {
  RoyalOSToolDefinition,
  RoyalOSToolRegistration,
} from "@/lib/tools/types";

/*
 * ============================================================
 * OPENAI IMAGE TOOL
 * ============================================================
 */

export const OPENAI_IMAGE_TOOL_ID =
  "openai.generate_image";

/*
 * ============================================================
 * TOOL REGISTRATION
 * ============================================================
 */

const openAIImageToolRegistration:
  RoyalOSToolRegistration<
    RoyalOSImageGenerationInput,
    RoyalOSImageGenerationOutput
  > = {
    definition: {
      id:
        OPENAI_IMAGE_TOOL_ID,

      name:
        "OpenAI Image Generator",

      description:
        "Generates professional images for RoyalOS workspaces and stores the completed assets securely in Supabase Storage.",

      version:
        "1.0.0",

      category:
        "image",

      provider:
        "openai",

      capabilities: [
        "generate_image",
        "store_asset",
      ],

      riskLevel:
        "medium",

      /*
       * Image generation may run automatically.
       *
       * Publishing the generated image publicly will use
       * a different tool that requires CEO approval.
       */

      approvalPolicy:
        "never",

      allowedEmployees: [
        "Nova",
        "Emmy",
        "Jack",
        "Adedeji",
      ],

      allowedWorkspaces: [
        "Triple-Hay Concept LLC",
        "ChoiceRoyals",
        "Xena Grace",
        "TD Talk",
      ],

      requiresConnection:
        true,

      connectionKey:
        "openai-images",

      enabled:
        true,

      timeoutMs:
        240_000,

      maximumAttempts:
        2,

      inputFields: [
        {
          key:
            "prompt",

          label:
            "Image Request",

          description:
            "Describe the image that RoyalOS should generate.",

          type:
            "textarea",

          required:
            true,

          placeholder:
            "Create a professional ChoiceRoyals cybersecurity webinar promotional image...",

          maximumLength:
            32_000,
        },

        {
          key:
            "title",

          label:
            "Asset Title",

          description:
            "Optional internal title for the generated RoyalOS asset.",

          type:
            "text",

          required:
            false,

          placeholder:
            "Cybersecurity Webinar Promotion",

          maximumLength:
            150,
        },

        {
          key:
            "purpose",

          label:
            "Image Purpose",

          description:
            "Select where or how the image will be used.",

          type:
            "select",

          required:
            false,

          defaultValue:
            "general",

          options: [
            {
              label:
                "Social Post",

              value:
                "social_post",
            },

            {
              label:
                "Website Banner",

              value:
                "website_banner",
            },

            {
              label:
                "Music Artwork",

              value:
                "music_artwork",
            },

            {
              label:
                "Book Cover",

              value:
                "book_cover",
            },

            {
              label:
                "Video Thumbnail",

              value:
                "video_thumbnail",
            },

            {
              label:
                "Promotional Flyer",

              value:
                "promotional_flyer",
            },

            {
              label:
                "Presentation",

              value:
                "presentation",
            },

            {
              label:
                "General",

              value:
                "general",
            },
          ],
        },

        {
          key:
            "size",

          label:
            "Image Size",

          description:
            "Choose the required image orientation and dimensions.",

          type:
            "select",

          required:
            false,

          defaultValue:
            "1024x1024",

          options: [
            {
              label:
                "Square — 1024 × 1024",

              value:
                "1024x1024",
            },

            {
              label:
                "Portrait — 1024 × 1536",

              value:
                "1024x1536",
            },

            {
              label:
                "Landscape — 1536 × 1024",

              value:
                "1536x1024",
            },

            {
              label:
                "Automatic",

              value:
                "auto",
            },
          ],
        },

        {
          key:
            "quality",

          label:
            "Image Quality",

          description:
            "Higher quality may take longer and use more API resources.",

          type:
            "select",

          required:
            false,

          defaultValue:
            "medium",

          options: [
            {
              label:
                "Low",

              value:
                "low",
            },

            {
              label:
                "Medium",

              value:
                "medium",
            },

            {
              label:
                "High",

              value:
                "high",
            },

            {
              label:
                "Automatic",

              value:
                "auto",
            },
          ],
        },

        {
          key:
            "background",

          label:
            "Background",

          description:
            "Choose whether the generated image should have an opaque or transparent background.",

          type:
            "select",

          required:
            false,

          defaultValue:
            "opaque",

          options: [
            {
              label:
                "Opaque",

              value:
                "opaque",
            },

            {
              label:
                "Transparent",

              value:
                "transparent",
            },

            {
              label:
                "Automatic",

              value:
                "auto",
            },
          ],
        },

        {
          key:
            "styleDirection",

          label:
            "Style Direction",

          description:
            "Optional visual style, lighting, colors, mood, or artistic direction.",

          type:
            "textarea",

          required:
            false,

          placeholder:
            "Premium dark-blue cybersecurity design with gold accents and realistic lighting.",

          maximumLength:
            4_000,
        },

        {
          key:
            "audience",

          label:
            "Target Audience",

          description:
            "Describe the people the image should appeal to.",

          type:
            "text",

          required:
            false,

          placeholder:
            "Small-business owners and beginning cybersecurity learners.",

          maximumLength:
            1_000,
        },

        {
          key:
            "includeText",

          label:
            "Include Text in Image",

          description:
            "Enable this when exact wording should appear inside the generated design.",

          type:
            "boolean",

          required:
            false,

          defaultValue:
            false,
        },

        {
          key:
            "textContent",

          label:
            "Text Content",

          description:
            "Exact wording that should appear inside the generated image.",

          type:
            "textarea",

          required:
            false,

          placeholder:
            "CYBERSECURITY FOR BEGINNERS",

          maximumLength:
            500,
        },

        {
          key:
            "additionalInstructions",

          label:
            "Additional Instructions",

          description:
            "Add any restrictions or special requirements for the image.",

          type:
            "textarea",

          required:
            false,

          placeholder:
            "Do not include faces, watermarks, random text, or unrelated logos.",

          maximumLength:
            4_000,
        },
      ],

      metadata: {
        primaryEmployee:
          "Nova",

        supportingEmployees: [
          "Emmy",
          "Jack",
          "Adedeji",
        ],

        createsPermanentAsset:
          true,

        storageBucket:
          "royalos-assets",

        publicPublishing:
          false,

        purpose:
          "RoyalOS professional image generation",
      },
    },

    handler:
      generateRoyalOSImage,
  };

/*
 * ============================================================
 * REGISTER TOOL
 * ============================================================
 */

export function registerOpenAIImageTool():
  RoyalOSToolDefinition {
  if (
    isRoyalOSToolRegistered(
      OPENAI_IMAGE_TOOL_ID
    )
  ) {
    const existing =
      getRoyalOSToolDefinition(
        OPENAI_IMAGE_TOOL_ID
      );

    if (existing) {
      return existing;
    }
  }

  return registerRoyalOSTool(
    openAIImageToolRegistration
  );
}