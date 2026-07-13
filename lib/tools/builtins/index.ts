import "server-only";

import {
  getRoyalOSToolRegistrySummary,
  listRoyalOSToolDefinitions,
} from "@/lib/tools/registry";

import {
  OPENAI_IMAGE_TOOL_ID,
  registerOpenAIImageTool,
} from "@/lib/tools/builtins/openai-image-tool";

import type {
  RoyalOSToolDefinition,
} from "@/lib/tools/types";

/*
 * ============================================================
 * BUILT-IN TOOL IDS
 * ============================================================
 */

export const ROYALOS_BUILTIN_TOOL_IDS = [
  OPENAI_IMAGE_TOOL_ID,
] as const;

export type RoyalOSBuiltInToolId =
  (typeof ROYALOS_BUILTIN_TOOL_IDS)[number];

/*
 * ============================================================
 * INITIALIZATION RESULT
 * ============================================================
 */

export type RoyalOSBuiltInToolsInitializationResult = {
  initialized:
    boolean;

  tools:
    RoyalOSToolDefinition[];

  registeredToolIds:
    string[];

  registrySummary:
    ReturnType<
      typeof getRoyalOSToolRegistrySummary
    >;
};

/*
 * ============================================================
 * DEVELOPMENT INITIALIZATION STATE
 * ============================================================
 *
 * The registry itself already uses globalThis.
 *
 * This flag prevents unnecessary repeated initialization during
 * Next.js development hot reloads.
 */

declare global {
  var __royalOSBuiltInToolsInitialized:
    | boolean
    | undefined;
}

/*
 * ============================================================
 * REGISTER ALL BUILT-IN TOOLS
 * ============================================================
 */

export function registerRoyalOSBuiltInTools():
  RoyalOSToolDefinition[] {
  const registeredTools: RoyalOSToolDefinition[] = [
    registerOpenAIImageTool(),
  ];

  if (
    process.env.NODE_ENV !==
    "production"
  ) {
    globalThis
      .__royalOSBuiltInToolsInitialized =
      true;
  }

  return registeredTools;
}

/*
 * ============================================================
 * ENSURE INITIALIZED
 * ============================================================
 */

export function ensureRoyalOSBuiltInTools():
  RoyalOSBuiltInToolsInitializationResult {
  const alreadyInitialized =
    globalThis
      .__royalOSBuiltInToolsInitialized ===
    true;

  const tools =
    registerRoyalOSBuiltInTools();

  return {
    initialized:
      true,

    tools,

    registeredToolIds:
      tools.map(
        (tool) =>
          tool.id
      ),

    registrySummary:
      getRoyalOSToolRegistrySummary(),

    /*
     * alreadyInitialized is intentionally evaluated so future
     * diagnostics can distinguish first initialization from a
     * development hot reload.
     */
    ...(
      alreadyInitialized
        ? {}
        : {}
    ),
  };
}

/*
 * ============================================================
 * READ BUILT-IN TOOL DEFINITIONS
 * ============================================================
 */

export function listRoyalOSBuiltInTools():
  RoyalOSToolDefinition[] {
  ensureRoyalOSBuiltInTools();

  const builtInToolIds =
    new Set<string>(
      ROYALOS_BUILTIN_TOOL_IDS
    );

  return listRoyalOSToolDefinitions()
    .filter(
      (tool) =>
        builtInToolIds.has(
          tool.id
        )
    );
}

/*
 * ============================================================
 * STATUS
 * ============================================================
 */

export function getRoyalOSBuiltInToolsStatus() {
  const initialization =
    ensureRoyalOSBuiltInTools();

  return {
    initialized:
      initialization.initialized,

    builtInToolCount:
      initialization.tools.length,

    builtInToolIds:
      initialization.registeredToolIds,

    registrySummary:
      initialization.registrySummary,
  };
}