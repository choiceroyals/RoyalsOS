import {
  createRoyalOSAssetSignedUrl,
  listRoyalOSAssets,
  ROYALOS_ASSET_APPROVAL_STATUSES,
  ROYALOS_ASSET_STATUSES,
  ROYALOS_ASSET_TYPES,
  type RoyalOSAssetApprovalStatus,
  type RoyalOSAssetStatus,
  type RoyalOSAssetType,
} from "@/lib/tools/database";

import {
  isRoyalOSEmployeeName,
  isRoyalOSWorkspace,
  type RoyalOSEmployeeName,
  type RoyalOSWorkspace,
} from "@/lib/missions/types";

export const runtime =
  "nodejs";

export const dynamic =
  "force-dynamic";

/*
 * ============================================================
 * HELPERS
 * ============================================================
 */

function cleanText(
  value: unknown,
  maximumLength =
    500
): string {
  if (
    typeof value !==
    "string"
  ) {
    return "";
  }

  return value
    .trim()
    .slice(
      0,
      maximumLength
    );
}

function parseInteger(
  value: unknown,
  fallback: number,
  minimum: number,
  maximum: number
): number {
  const parsed =
    typeof value ===
      "number"
      ? value
      : Number(
          cleanText(value)
        );

  if (
    !Number.isFinite(
      parsed
    )
  ) {
    return fallback;
  }

  return Math.min(
    maximum,
    Math.max(
      minimum,
      Math.floor(
        parsed
      )
    )
  );
}

function isAllowedValue<
  TValue extends string,
>(
  values:
    readonly TValue[],
  value: unknown
): value is TValue {
  return (
    typeof value ===
      "string" &&
    values.includes(
      value as TValue
    )
  );
}

/*
 * ============================================================
 * GET — LIST ROYALOS ASSETS
 * ============================================================
 *
 * Examples:
 *
 * /api/tools/assets
 *
 * /api/tools/assets?employee=Nova
 *
 * /api/tools/assets?workspace=ChoiceRoyals
 *
 * /api/tools/assets?assetType=image
 *
 * /api/tools/assets?status=ready
 */

export async function GET(
  request: Request
) {
  try {
    const url =
      new URL(
        request.url
      );

    const missionId =
      cleanText(
        url.searchParams.get(
          "missionId"
        ),
        200
      );

    const actionId =
      cleanText(
        url.searchParams.get(
          "actionId"
        ),
        200
      );

    const employeeValue =
      cleanText(
        url.searchParams.get(
          "employee"
        ),
        100
      );

    const workspaceValue =
      cleanText(
        url.searchParams.get(
          "workspace"
        ),
        200
      );

    const assetTypeValue =
      cleanText(
        url.searchParams.get(
          "assetType"
        ),
        100
      );

    const statusValue =
      cleanText(
        url.searchParams.get(
          "status"
        ),
        100
      );

    const approvalStatusValue =
      cleanText(
        url.searchParams.get(
          "approvalStatus"
        ),
        100
      );

    const limit =
      parseInteger(
        url.searchParams.get(
          "limit"
        ),
        24,
        1,
        100
      );

    const offset =
      parseInteger(
        url.searchParams.get(
          "offset"
        ),
        0,
        0,
        100_000
      );

    const expiresInSeconds =
      parseInteger(
        url.searchParams.get(
          "expiresIn"
        ),
        3_600,
        60,
        86_400
      );

    const order =
      url.searchParams.get(
        "order"
      ) ===
      "oldest"
        ? "oldest"
        : "newest";

    const employee:
      RoyalOSEmployeeName |
      undefined =
        isRoyalOSEmployeeName(
          employeeValue
        )
          ? employeeValue
          : undefined;

    const workspace:
      RoyalOSWorkspace |
      undefined =
        isRoyalOSWorkspace(
          workspaceValue
        )
          ? workspaceValue
          : undefined;

    const assetType:
      RoyalOSAssetType |
      undefined =
        isAllowedValue(
          ROYALOS_ASSET_TYPES,
          assetTypeValue
        )
          ? assetTypeValue
          : undefined;

    const status:
      RoyalOSAssetStatus |
      undefined =
        isAllowedValue(
          ROYALOS_ASSET_STATUSES,
          statusValue
        )
          ? statusValue
          : undefined;

    const approvalStatus:
      RoyalOSAssetApprovalStatus |
      undefined =
        isAllowedValue(
          ROYALOS_ASSET_APPROVAL_STATUSES,
          approvalStatusValue
        )
          ? approvalStatusValue
          : undefined;

    const result =
      await listRoyalOSAssets({
        missionId:
          missionId ||
          undefined,

        actionId:
          actionId ||
          undefined,

        employee,

        workspace,

        assetType,

        status,

        approvalStatus,

        limit,

        offset,

        order,
      });

    /*
     * Generate fresh temporary access links.
     *
     * The actual files remain private inside Supabase Storage.
     */

    const assets =
      await Promise.all(
        result.assets.map(
          async (
            asset
          ) => {
            let signedUrl:
              string |
              null =
                null;

            let signedUrlError:
              string |
              null =
                null;

            if (
              asset.status ===
                "ready" &&
              asset.storage_path
            ) {
              try {
                signedUrl =
                  await createRoyalOSAssetSignedUrl(
                    asset.asset_id,
                    expiresInSeconds
                  );
              } catch (
                error
              ) {
                signedUrlError =
                  error instanceof Error
                    ? error.message
                    : "RoyalOS could not create the asset preview link.";
              }
            }

            return {
              ...asset,

              signed_url:
                signedUrl,

              signed_url_expires_in_seconds:
                signedUrl
                  ? expiresInSeconds
                  : null,

              signed_url_error:
                process.env
                  .NODE_ENV ===
                "development"
                  ? signedUrlError
                  : null,
            };
          }
        )
      );

    return Response.json(
      {
        message:
          "RoyalOS assets retrieved successfully.",

        assets,

        pagination: {
          count:
            result.count,

          limit:
            result.limit,

          offset:
            result.offset,

          returned:
            assets.length,

          hasMore:
            result.offset +
              assets.length <
            result.count,
        },

        filters: {
          missionId:
            missionId ||
            null,

          actionId:
            actionId ||
            null,

          employee:
            employee ??
            null,

          workspace:
            workspace ??
            null,

          assetType:
            assetType ??
            null,

          status:
            status ??
            null,

          approvalStatus:
            approvalStatus ??
            null,

          order,
        },

        timestamp:
          new Date()
            .toISOString(),
      },
      {
        status: 200,

        headers: {
          "Cache-Control":
            "no-store, max-age=0",
        },
      }
    );
  } catch (error) {
    console.error(
      "RoyalOS Assets GET error:",
      error
    );

    return Response.json(
      {
        error:
          "RoyalOS could not retrieve the asset library.",

        details:
          process.env
            .NODE_ENV ===
          "development"
            ? error instanceof Error
              ? error.message
              : "Unknown RoyalOS asset-library error."
            : undefined,
      },
      {
        status: 500,
      }
    );
  }
}