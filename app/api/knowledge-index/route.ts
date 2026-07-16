import {
  getRoyalOSKnowledgeIndex,
  searchRoyalOSKnowledgeIndex,
} from "../../../lib/knowledgeIndex";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function cleanValue(value: string | null): string {
  return value?.trim() ?? "";
}

function parseLimit(value: string | null): number {
  const parsed = Number(value);

  if (!Number.isFinite(parsed)) {
    return 20;
  }

  return Math.min(
    100,
    Math.max(1, Math.floor(parsed))
  );
}

/**
 * GET /api/knowledge-index
 *
 * Examples:
 * /api/knowledge-index
 * /api/knowledge-index?q=cybersecurity
 */
export async function GET(request: Request) {
  try {
    const url = new URL(request.url);

    const query = cleanValue(
      url.searchParams.get("q")
    );

    const limit = parseLimit(
      url.searchParams.get("limit")
    );

    const refresh =
      url.searchParams.get("refresh") === "true";

    if (query) {
      const matches =
        await searchRoyalOSKnowledgeIndex({
          query,
          limit,
          refresh,
        });

      return Response.json({
        message:
          "RoyalOS Knowledge Index search completed.",

        query,

        matchesFound:
          matches.length,

        matches: matches.map((match) => ({
          score:
            match.score,

          matchedTerms:
            match.matchedTerms,

          document: {
            id:
              match.entry.id,

            title:
              match.entry.title,

            relativePath:
              match.entry.relativePath,

            category:
              match.entry.category,

            employeeHints:
              match.entry.employeeHints,

            workspaceHints:
              match.entry.workspaceHints,

            headings:
              match.entry.headings,

            excerpt:
              match.entry.excerpt,

            wordCount:
              match.entry.wordCount,

            modifiedAt:
              match.entry.modifiedAt,
          },
        })),
      });
    }

    const index =
      await getRoyalOSKnowledgeIndex({
        refresh,
      });

    return Response.json({
      message:
        "RoyalOS Knowledge Index is working.",

      index: {
        version:
          index.version,

        generatedAt:
          index.generatedAt,

        documentCount:
          index.documentCount,

        totalWords:
          index.totalWords,

        totalCharacters:
          index.totalCharacters,

        categories:
          index.categories,

        workspaces:
          index.workspaces,

        employees:
          index.employees,

        fingerprint:
          index.fingerprint,

        documents:
          index.entries.map((entry) => ({
            id:
              entry.id,

            title:
              entry.title,

            relativePath:
              entry.relativePath,

            category:
              entry.category,

            wordCount:
              entry.wordCount,

            modifiedAt:
              entry.modifiedAt,
          })),
      },
    });
  } catch (error) {
    console.error(
      "RoyalOS Knowledge Index error:",
      error
    );

    return Response.json(
      {
        error:
          "RoyalOS could not load the Knowledge Index.",

        details:
          error instanceof Error
            ? error.message
            : "Unknown Knowledge Index error.",
      },
      {
        status: 500,
      }
    );
  }
}