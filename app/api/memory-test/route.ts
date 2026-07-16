import {
  checkRoyalOSMemoryHealth,
  createRoyalOSMemory,
  retrieveRoyalOSMemories,
} from "../../../lib/memory";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type MemoryTestRequest = {
  message?: unknown;
};

function isDevelopment(): boolean {
  return process.env.NODE_ENV === "development";
}

function cleanValue(value: unknown): string {
  return typeof value === "string"
    ? value.trim()
    : "";
}

/**
 * GET /api/memory-test
 *
 * Confirms that RoyalOS can connect to the
 * permanent Supabase memory table.
 */
export async function GET() {
  if (!isDevelopment()) {
    return Response.json(
      {
        error:
          "The RoyalOS memory test route is available only during development.",
      },
      { status: 403 }
    );
  }

  const health =
    await checkRoyalOSMemoryHealth();

  return Response.json(
    {
      message: health.connected
        ? "RoyalOS permanent memory is connected."
        : "RoyalOS permanent memory is not connected.",

      health,
    },
    {
      status: health.connected
        ? 200
        : 500,
    }
  );
}

/**
 * POST /api/memory-test
 *
 * Creates one temporary test memory and then
 * retrieves it from Supabase to prove that both
 * writing and reading work.
 */
export async function POST(
  request: Request
) {
  if (!isDevelopment()) {
    return Response.json(
      {
        error:
          "The RoyalOS memory test route is available only during development.",
      },
      { status: 403 }
    );
  }

  let body: MemoryTestRequest = {};

  try {
    body =
      (await request.json()) as MemoryTestRequest;
  } catch {
    // An empty request body is acceptable.
  }

  const customMessage =
    cleanValue(body.message);

  const uniqueReference =
    `RoyalOS memory test ${Date.now()}`;

  const content =
    customMessage ||
    `Permanent memory write-and-read test completed using reference: ${uniqueReference}.`;

  try {
    const createdMemory =
      await createRoyalOSMemory({
        title:
          uniqueReference,

        content,

        summary:
          "Development test confirming that RoyalOS can write to Supabase permanent memory.",

        scope:
          "company",

        status:
          "active",

        importance:
          "low",

        sensitivity:
          "internal",

        sourceType:
          "system_event",

        workspace:
          "Triple-Hay Concept LLC",

        tags: [
          "memory test",
          "supabase",
          "development",
          uniqueReference,
        ],

        allowedEmployees: [],

        createdBy:
          "RoyalOS",

        metadata: {
          testRecord: true,
          route:
            "/api/memory-test",
        },
      });

    const retrievedBundle =
      await retrieveRoyalOSMemories({
        query:
          uniqueReference,

        requester:
          "RoyalOS",

        workspace:
          "Triple-Hay Concept LLC",

        scopes: [
          "company",
        ],

        statuses: [
          "active",
        ],

        tags: [
          "memory test",
        ],

        limit: 5,

        includePrivate:
          false,
      });

    const retrievedMemory =
      retrievedBundle.matches.find(
        (match) =>
          match.memory.id ===
          createdMemory.id
      )?.memory;

    const testPassed =
      Boolean(retrievedMemory);

    console.log(
      "RoyalOS permanent memory test:",
      {
        testPassed,
        createdMemoryId:
          createdMemory.id,
        memoriesFound:
          retrievedBundle.memoriesFound,
        memoriesSelected:
          retrievedBundle.memoriesSelected,
      }
    );

    return Response.json(
      {
        message: testPassed
          ? "RoyalOS successfully wrote and retrieved permanent memory."
          : "RoyalOS wrote the memory, but retrieval did not return the expected record.",

        testPassed,

        createdMemory: {
          id:
            createdMemory.id,

          title:
            createdMemory.title,

          status:
            createdMemory.status,

          scope:
            createdMemory.scope,

          createdAt:
            createdMemory.createdAt,
        },

        retrieval: {
          memoriesFound:
            retrievedBundle.memoriesFound,

          memoriesSelected:
            retrievedBundle.memoriesSelected,

          selectedMemoryIds:
            retrievedBundle.selectedMemoryIds,

          expectedMemoryRetrieved:
            testPassed,
        },
      },
      {
        status: testPassed
          ? 200
          : 500,
      }
    );
  } catch (error) {
    console.error(
      "RoyalOS permanent memory test failed:",
      error
    );

    return Response.json(
      {
        error:
          "RoyalOS could not complete the permanent memory test.",

        details:
          error instanceof Error
            ? error.message
            : "Unknown memory test error.",
      },
      { status: 500 }
    );
  }
}