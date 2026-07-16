"use client";

import {
  BRAND_ASSIGNMENTS_SEED,
  BRAND_WEBSITES_SEED,
  ROYALOS_BRANDS,
} from "@/lib/brands/config";
import type {
  BrandConnection,
  BrandConnectionEvent,
  BrandOperationsState,
  BrandPublishingJob,
  BrandWebsite,
} from "@/lib/brands/types";

export const BRAND_OPERATIONS_STORAGE_KEY = "royalos:brand-operations:v1";
export const BRAND_OPERATIONS_EVENT = "royalos:brand-operations-updated";

export function createInitialBrandOperationsState(): BrandOperationsState {
  return {
    version: 1,
    selectedBrandId: "brand-choiceroyals",
    brands: JSON.parse(JSON.stringify(ROYALOS_BRANDS)),
    websites: JSON.parse(JSON.stringify(BRAND_WEBSITES_SEED)),
    connections: [],
    assignments: JSON.parse(JSON.stringify(BRAND_ASSIGNMENTS_SEED)),
    publishingJobs: [],
    events: [],
    updatedAt: "",
  };
}

export function loadBrandOperationsState(): BrandOperationsState {
  if (typeof window === "undefined") return createInitialBrandOperationsState();
  const raw = window.localStorage.getItem(BRAND_OPERATIONS_STORAGE_KEY);
  if (!raw) return createInitialBrandOperationsState();
  try {
    const parsed = JSON.parse(raw) as Partial<BrandOperationsState>;
    if (parsed.version !== 1) return createInitialBrandOperationsState();
    const seed = createInitialBrandOperationsState();
    return {
      ...seed,
      ...parsed,
      brands: parsed.brands ?? seed.brands,
      websites: parsed.websites ?? seed.websites,
      connections: parsed.connections ?? seed.connections,
      assignments: parsed.assignments ?? seed.assignments,
      publishingJobs: parsed.publishingJobs ?? seed.publishingJobs,
      events: parsed.events ?? seed.events,
      selectedBrandId:
        parsed.selectedBrandId &&
        (parsed.brands ?? seed.brands).some((brand) => brand.id === parsed.selectedBrandId)
          ? parsed.selectedBrandId
          : seed.selectedBrandId,
      version: 1,
    };
  } catch {
    return createInitialBrandOperationsState();
  }
}

export function saveBrandOperationsState(state: BrandOperationsState): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(
    BRAND_OPERATIONS_STORAGE_KEY,
    JSON.stringify({ ...state, updatedAt: new Date().toISOString() }),
  );
  window.dispatchEvent(new CustomEvent(BRAND_OPERATIONS_EVENT));
}

export function mergeBrandConnections(
  state: BrandOperationsState,
  incoming: BrandConnection[],
): BrandOperationsState {
  const localById = new Map(state.connections.map((connection) => [connection.id, connection]));
  const merged = incoming.map((connection) => ({
    ...connection,
    ...(localById.get(connection.id) ?? {}),
    requiredEnvironmentVariables: connection.requiredEnvironmentVariables,
    missingEnvironmentVariables: connection.missingEnvironmentVariables,
    status:
      localById.get(connection.id)?.status === "disconnected"
        ? "disconnected"
        : connection.status,
  }));
  return { ...state, connections: merged, updatedAt: new Date().toISOString() };
}

export function addBrandEvent(
  state: BrandOperationsState,
  input: Omit<BrandConnectionEvent, "id" | "createdAt">,
): BrandOperationsState {
  const event: BrandConnectionEvent = {
    ...input,
    id: `brand_event_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    createdAt: new Date().toISOString(),
  };
  return { ...state, events: [event, ...state.events].slice(0, 300) };
}

export function addBrandPublishingJob(
  state: BrandOperationsState,
  input: Omit<BrandPublishingJob, "id" | "updatedAt">,
): BrandOperationsState {
  const job: BrandPublishingJob = {
    ...input,
    id: `brand_publish_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    updatedAt: new Date().toISOString(),
  };
  return addBrandEvent(
    { ...state, publishingJobs: [job, ...state.publishingJobs] },
    {
      brandId: job.brandId,
      action: "Publishing job created",
      actor: job.createdBy,
      result: "success",
      detail: `${job.title} was added to the brand publishing queue.`,
    },
  );
}

export function updateBrandPublishingJob(
  state: BrandOperationsState,
  id: string,
  patch: Partial<BrandPublishingJob>,
): BrandOperationsState {
  return {
    ...state,
    publishingJobs: state.publishingJobs.map((job) =>
      job.id === id ? { ...job, ...patch, updatedAt: new Date().toISOString() } : job,
    ),
  };
}


export function addBrandWebsite(
  state: BrandOperationsState,
  input: Omit<BrandWebsite, "id" | "health" | "sslStatus" | "lastCheckedAt"> & {
    health?: BrandWebsite["health"];
    sslStatus?: BrandWebsite["sslStatus"];
  },
): BrandOperationsState {
  const website: BrandWebsite = {
    ...input,
    id: `brand_site_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    health: input.health ?? "not_checked",
    sslStatus: input.sslStatus ?? "not_checked",
  };
  return addBrandEvent(
    { ...state, websites: [website, ...state.websites] },
    {
      brandId: website.brandId,
      action: "Website added",
      actor: "Ayobami",
      result: "success",
      detail: `${website.label} (${website.url}) was added to the brand website registry.`,
    },
  );
}

export function updateBrandWebsite(
  state: BrandOperationsState,
  id: string,
  patch: Partial<BrandWebsite>,
): BrandOperationsState {
  return {
    ...state,
    websites: state.websites.map((website) =>
      website.id === id ? { ...website, ...patch } : website,
    ),
    updatedAt: new Date().toISOString(),
  };
}

export function removeBrandWebsite(
  state: BrandOperationsState,
  id: string,
): BrandOperationsState {
  const website = state.websites.find((item) => item.id === id);
  const next = {
    ...state,
    websites: state.websites.filter((item) => item.id !== id),
    updatedAt: new Date().toISOString(),
  };
  return website
    ? addBrandEvent(next, {
        brandId: website.brandId,
        action: "Website removed",
        actor: "Ayobami",
        result: "warning",
        detail: `${website.label} (${website.url}) was removed from the brand website registry.`,
      })
    : next;
}
