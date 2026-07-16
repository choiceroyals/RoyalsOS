"use client";

import type {
  IntegrationActivityItem,
  SocialPublishingDraft,
  SocialPublishingStatus,
} from "@/lib/integrations/types";

export const SOCIAL_PUBLISHING_QUEUE_KEY = "royalos.socialPublishingQueue.v1";
export const INTEGRATION_ACTIVITY_KEY = "royalos.integrationActivity.v1";
export const SOCIAL_QUEUE_EVENT = "royalos:social-queue-updated";
export const INTEGRATION_ACTIVITY_EVENT = "royalos:integration-activity-updated";

function safeParseArray<T>(value: string | null): T[] {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value) as unknown;
    return Array.isArray(parsed) ? (parsed as T[]) : [];
  } catch {
    return [];
  }
}

export function readSocialPublishingQueue(): SocialPublishingDraft[] {
  if (typeof window === "undefined") return [];
  return safeParseArray<SocialPublishingDraft>(
    window.localStorage.getItem(SOCIAL_PUBLISHING_QUEUE_KEY)
  ).sort((first, second) => second.updatedAt.localeCompare(first.updatedAt));
}

export function saveSocialPublishingQueue(queue: SocialPublishingDraft[]): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(SOCIAL_PUBLISHING_QUEUE_KEY, JSON.stringify(queue));
  window.dispatchEvent(new CustomEvent(SOCIAL_QUEUE_EVENT));
}

export function createSocialPublishingDraft(
  input: Omit<SocialPublishingDraft, "id" | "createdAt" | "updatedAt">
): SocialPublishingDraft {
  const now = new Date().toISOString();
  const draft: SocialPublishingDraft = {
    ...input,
    id: `social_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    createdAt: now,
    updatedAt: now,
  };
  saveSocialPublishingQueue([draft, ...readSocialPublishingQueue()]);
  addIntegrationActivity({
    action: "Publishing handoff created",
    subject: draft.title,
    result: "success",
    detail: `${draft.sourceEmployee} sent a ${draft.contentType.toLowerCase()} item to Emmy's publishing queue.`,
  });
  return draft;
}

export function updateSocialPublishingDraft(
  id: string,
  patch: Partial<Pick<SocialPublishingDraft, "status" | "caption" | "channels" | "scheduledFor" | "notes">>
): void {
  const next = readSocialPublishingQueue().map((draft) =>
    draft.id === id
      ? {
          ...draft,
          ...patch,
          updatedAt: new Date().toISOString(),
        }
      : draft
  );
  saveSocialPublishingQueue(next);
}

export function removeSocialPublishingDraft(id: string): void {
  const queue = readSocialPublishingQueue();
  const removed = queue.find((draft) => draft.id === id);
  saveSocialPublishingQueue(queue.filter((draft) => draft.id !== id));
  if (removed) {
    addIntegrationActivity({
      action: "Publishing item removed",
      subject: removed.title,
      result: "information",
      detail: "The draft was removed from the local RoyalOS publishing queue.",
    });
  }
}

export function transitionSocialPublishingDraft(
  id: string,
  status: SocialPublishingStatus
): void {
  const draft = readSocialPublishingQueue().find((item) => item.id === id);
  updateSocialPublishingDraft(id, { status });
  if (draft) {
    addIntegrationActivity({
      action: "Publishing status changed",
      subject: draft.title,
      result: status === "awaiting_approval" || status === "approved" ? "success" : "information",
      detail: `Status changed to ${status.replaceAll("_", " ")}.`,
    });
  }
}

export function readIntegrationActivity(): IntegrationActivityItem[] {
  if (typeof window === "undefined") return [];
  return safeParseArray<IntegrationActivityItem>(
    window.localStorage.getItem(INTEGRATION_ACTIVITY_KEY)
  ).sort((first, second) => second.createdAt.localeCompare(first.createdAt));
}

export function addIntegrationActivity(
  input: Omit<IntegrationActivityItem, "id" | "createdAt">
): IntegrationActivityItem {
  const item: IntegrationActivityItem = {
    ...input,
    id: `activity_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    createdAt: new Date().toISOString(),
  };
  if (typeof window !== "undefined") {
    const next = [item, ...readIntegrationActivity()].slice(0, 100);
    window.localStorage.setItem(INTEGRATION_ACTIVITY_KEY, JSON.stringify(next));
    window.dispatchEvent(new CustomEvent(INTEGRATION_ACTIVITY_EVENT));
  }
  return item;
}
