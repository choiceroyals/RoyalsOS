"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";

import {
  INTEGRATION_ACTIVITY_EVENT,
  SOCIAL_QUEUE_EVENT,
  addIntegrationActivity,
  createSocialPublishingDraft,
  readIntegrationActivity,
  readSocialPublishingQueue,
  removeSocialPublishingDraft,
  transitionSocialPublishingDraft,
} from "@/lib/integrations/client";
import type {
  IntegrationActivityItem,
  RoyalOSIntegrationPublicStatus,
  SocialPublishingDraft,
} from "@/lib/integrations/types";

import styles from "./IntegrationsCenter.module.css";

type IntegrationsResponse = {
  integrations?: RoyalOSIntegrationPublicStatus[];
  summary?: {
    total: number;
    connected: number;
    credentialsReady: number;
    notConfigured: number;
    planned: number;
  };
  error?: string;
};

type SetupResponse = {
  integration?: RoyalOSIntegrationPublicStatus;
  ready?: boolean;
  credentialsReady?: boolean;
  message?: string;
  callbackPath?: string;
  missingEnvironmentVariables?: string[];
  error?: string;
};

type ViewMode = "connections" | "publishing" | "permissions" | "activity";

const WORKSPACES = [
  "Triple-Hay Concept LLC",
  "ChoiceRoyals",
  "Xena Grace",
  "TD Talk",
];

const SOCIAL_CHANNELS = [
  "Facebook",
  "Instagram",
  "LinkedIn",
  "X",
  "TikTok",
  "YouTube",
  "WordPress",
];

function statusLabel(status: RoyalOSIntegrationPublicStatus["status"]): string {
  switch (status) {
    case "connected":
      return "Connected";
    case "credentials_ready":
      return "Credentials ready";
    case "planned":
      return "Planned";
    case "needs_attention":
      return "Needs attention";
    default:
      return "Not configured";
  }
}

function friendlyDate(value: string): string {
  try {
    return new Date(value).toLocaleString();
  } catch {
    return value;
  }
}

export default function IntegrationsCenter() {
  const [view, setView] = useState<ViewMode>("connections");
  const [workspace, setWorkspace] = useState("ChoiceRoyals");
  const [integrations, setIntegrations] = useState<RoyalOSIntegrationPublicStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedIntegration, setSelectedIntegration] =
    useState<RoyalOSIntegrationPublicStatus | null>(null);
  const [setupMessage, setSetupMessage] = useState("");
  const [checkingId, setCheckingId] = useState("");
  const [queue, setQueue] = useState<SocialPublishingDraft[]>([]);
  const [activity, setActivity] = useState<IntegrationActivityItem[]>([]);
  const [draftTitle, setDraftTitle] = useState("");
  const [draftCaption, setDraftCaption] = useState("");
  const [draftChannels, setDraftChannels] = useState<string[]>(["Instagram", "Facebook"]);

  async function loadIntegrations() {
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/integrations", { cache: "no-store" });
      const data = (await response.json()) as IntegrationsResponse;
      if (!response.ok || !Array.isArray(data.integrations)) {
        throw new Error(data.error || "RoyalOS could not load the integration registry.");
      }
      setIntegrations(data.integrations);
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "RoyalOS could not load the integration registry."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const refreshQueue = () => setQueue(readSocialPublishingQueue());
    const refreshActivity = () => setActivity(readIntegrationActivity());
    const initialLoad = window.setTimeout(() => {
      void loadIntegrations();
      refreshQueue();
      refreshActivity();
    }, 0);

    window.addEventListener(SOCIAL_QUEUE_EVENT, refreshQueue);
    window.addEventListener(INTEGRATION_ACTIVITY_EVENT, refreshActivity);
    return () => {
      window.clearTimeout(initialLoad);
      window.removeEventListener(SOCIAL_QUEUE_EVENT, refreshQueue);
      window.removeEventListener(INTEGRATION_ACTIVITY_EVENT, refreshActivity);
    };
  }, []);

  const summary = useMemo(() => {
    return {
      connected: integrations.filter((item) => item.status === "connected").length,
      ready: integrations.filter((item) => item.status === "credentials_ready").length,
      missing: integrations.filter((item) => item.status === "not_configured").length,
      planned: integrations.filter((item) => item.status === "planned").length,
    };
  }, [integrations]);

  const groupedIntegrations = useMemo(() => {
    const groups = new Map<string, RoyalOSIntegrationPublicStatus[]>();
    for (const integration of integrations) {
      const current = groups.get(integration.category) ?? [];
      current.push(integration);
      groups.set(integration.category, current);
    }
    return Array.from(groups.entries());
  }, [integrations]);

  const queueSummary = useMemo(() => {
    return {
      draft: queue.filter((item) => item.status === "draft" || item.status === "awaiting_media").length,
      approval: queue.filter((item) => item.status === "awaiting_approval").length,
      approved: queue.filter((item) => item.status === "approved").length,
      scheduled: queue.filter((item) => item.status === "scheduled").length,
    };
  }, [queue]);

  async function inspectIntegration(integration: RoyalOSIntegrationPublicStatus) {
    setSelectedIntegration(integration);
    setSetupMessage("");
    setCheckingId(integration.id);
    try {
      const response = await fetch("/api/integrations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "prepare", integrationId: integration.id }),
      });
      const data = (await response.json()) as SetupResponse;
      if (!response.ok) throw new Error(data.error || "Connection inspection failed.");
      setSetupMessage(data.message || "RoyalOS inspected this connection.");
      addIntegrationActivity({
        action: "Connection inspected",
        subject: integration.name,
        result: data.ready ? "success" : "attention",
        detail: data.message || "RoyalOS inspected this connection.",
      });
    } catch (caughtError) {
      const message =
        caughtError instanceof Error ? caughtError.message : "Connection inspection failed.";
      setSetupMessage(message);
      addIntegrationActivity({
        action: "Connection inspection failed",
        subject: integration.name,
        result: "attention",
        detail: message,
      });
    } finally {
      setCheckingId("");
    }
  }

  function toggleDraftChannel(channel: string) {
    setDraftChannels((previous) =>
      previous.includes(channel)
        ? previous.filter((item) => item !== channel)
        : [...previous, channel]
    );
  }

  function createPublishingItem(event: FormEvent) {
    event.preventDefault();
    if (!draftTitle.trim() || !draftCaption.trim() || draftChannels.length === 0) return;

    createSocialPublishingDraft({
      title: draftTitle.trim(),
      workspace,
      sourceEmployee: "Emmy",
      contentType: "Social post",
      caption: draftCaption.trim(),
      channels: draftChannels,
      status: "draft",
      notes: "Created in the RoyalOS Connections and Publishing Center.",
    });
    setDraftTitle("");
    setDraftCaption("");
  }

  const connectedSocialPlatforms = integrations.filter(
    (item) => item.category === "Social & Publishing" && item.status === "connected"
  ).length;

  return (
    <div className={styles.center}>
      <section className={styles.hero}>
        <div>
          <span className={styles.eyebrow}>RoyalOS Phase 3 foundation</span>
          <h1>Connections & Publishing Center</h1>
          <p>
            Connect company platforms, control employee permissions, prepare social content,
            preserve approvals, and keep an audit trail. Secrets stay in server-side environment
            variables and are never displayed in the browser.
          </p>
        </div>
        <div className={styles.workspaceControl}>
          <span>Active workspace</span>
          <select value={workspace} onChange={(event) => setWorkspace(event.target.value)}>
            {WORKSPACES.map((item) => (
              <option key={item} value={item}>{item}</option>
            ))}
          </select>
        </div>
      </section>

      <section className={styles.metrics}>
        <article><strong>{summary.connected}</strong><span>Connected</span></article>
        <article><strong>{summary.ready}</strong><span>Credentials ready</span></article>
        <article><strong>{summary.missing}</strong><span>Need setup</span></article>
        <article><strong>{queue.length}</strong><span>Publishing items</span></article>
      </section>

      <nav className={styles.tabs} aria-label="Connections center sections">
        {([
          ["connections", "Connections"],
          ["publishing", "Publishing queue"],
          ["permissions", "Employee access"],
          ["activity", "Activity log"],
        ] as const).map(([id, label]) => (
          <button
            type="button"
            key={id}
            className={view === id ? styles.tabActive : ""}
            onClick={() => setView(id)}
          >
            {label}
          </button>
        ))}
      </nav>

      {view === "connections" ? (
        <div className={styles.sectionStack}>
          <section className={styles.notice}>
            <strong>{connectedSocialPlatforms} social publishing connections detected.</strong>
            <span>
              A connection is only marked connected when RoyalOS detects its server-side token or
              service credential. OAuth consent and provider-specific publishing adapters remain
              approval-controlled implementation steps.
            </span>
          </section>

          {error ? <div className={styles.error}>{error}</div> : null}
          {loading ? <div className={styles.loading}>Reading RoyalOS integration registry…</div> : null}

          {groupedIntegrations.map(([category, items]) => (
            <section className={styles.card} key={category}>
              <div className={styles.cardHeader}>
                <div>
                  <h2>{category}</h2>
                  <p>{items.length} planned or configured connections</p>
                </div>
              </div>
              <div className={styles.connectionGrid}>
                {items.map((integration) => (
                  <article className={styles.connectionCard} key={integration.id}>
                    <div className={styles.connectionTop}>
                      <span
                        className={styles.providerIcon}
                        style={{ borderColor: `${integration.color}80`, color: integration.color }}
                      >
                        {integration.icon}
                      </span>
                      <span className={`${styles.connectionStatus} ${styles[integration.status]}`}>
                        {statusLabel(integration.status)}
                      </span>
                    </div>
                    <h3>{integration.name}</h3>
                    <p>{integration.description}</p>
                    <div className={styles.capabilities}>
                      {integration.capabilities.slice(0, 3).map((capability) => (
                        <span key={capability}>{capability}</span>
                      ))}
                    </div>
                    <div className={styles.employeeLine}>
                      <b>Employees:</b> {integration.allowedEmployees.join(", ")}
                    </div>
                    <button
                      type="button"
                      onClick={() => void inspectIntegration(integration)}
                      disabled={checkingId === integration.id}
                    >
                      {checkingId === integration.id
                        ? "Checking…"
                        : integration.status === "connected"
                          ? "Inspect connection"
                          : integration.status === "credentials_ready"
                            ? "Prepare OAuth"
                            : integration.status === "planned"
                              ? "View plan"
                              : "View setup"}
                    </button>
                  </article>
                ))}
              </div>
            </section>
          ))}
        </div>
      ) : null}

      {view === "publishing" ? (
        <div className={styles.publishingLayout}>
          <section className={styles.card}>
            <div className={styles.cardHeader}>
              <div>
                <h2>Emmy publishing queue</h2>
                <p>Cine, Jack, Nova, and Emmy can hand approved work into this queue.</p>
              </div>
            </div>

            <div className={styles.queueMetrics}>
              <span><b>{queueSummary.draft}</b> Draft</span>
              <span><b>{queueSummary.approval}</b> Awaiting approval</span>
              <span><b>{queueSummary.approved}</b> Approved</span>
              <span><b>{queueSummary.scheduled}</b> Scheduled</span>
            </div>

            <div className={styles.queueList}>
              {queue.length === 0 ? (
                <div className={styles.emptyState}>
                  No publishing items yet. Create one here or send a Cine production plan to Emmy.
                </div>
              ) : queue.map((item) => (
                <article className={styles.queueItem} key={item.id}>
                  <div className={styles.queueItemTop}>
                    <div>
                      <strong>{item.title}</strong>
                      <span>{item.workspace} · {item.sourceEmployee} · {item.contentType}</span>
                    </div>
                    <i>{item.status.replaceAll("_", " ")}</i>
                  </div>
                  <p>{item.caption}</p>
                  <div className={styles.channelRow}>
                    {item.channels.map((channel) => <span key={channel}>{channel}</span>)}
                  </div>
                  <small>Updated {friendlyDate(item.updatedAt)}</small>
                  <div className={styles.queueActions}>
                    {item.status === "draft" || item.status === "awaiting_media" ? (
                      <button
                        type="button"
                        onClick={() => transitionSocialPublishingDraft(item.id, "awaiting_approval")}
                      >
                        Request approval
                      </button>
                    ) : null}
                    {item.status === "awaiting_approval" ? (
                      <button
                        type="button"
                        onClick={() => transitionSocialPublishingDraft(item.id, "approved")}
                      >
                        CEO approve
                      </button>
                    ) : null}
                    <button type="button" onClick={() => removeSocialPublishingDraft(item.id)}>
                      Remove
                    </button>
                    <button type="button" disabled title="Provider publishing adapters are not connected yet.">
                      Publish
                    </button>
                  </div>
                </article>
              ))}
            </div>
          </section>

          <section className={styles.card}>
            <div className={styles.cardHeader}>
              <div>
                <h2>Create social draft</h2>
                <p>Prepare content now. External publishing stays locked until a provider adapter is connected.</p>
              </div>
            </div>
            <form className={styles.draftForm} onSubmit={createPublishingItem}>
              <label>
                <span>Campaign or post title</span>
                <input value={draftTitle} onChange={(event) => setDraftTitle(event.target.value)} placeholder="Xena Grace release announcement" />
              </label>
              <label>
                <span>Caption</span>
                <textarea value={draftCaption} onChange={(event) => setDraftCaption(event.target.value)} placeholder="Write the approved message Emmy should prepare for publishing." />
              </label>
              <div className={styles.channelPicker}>
                {SOCIAL_CHANNELS.map((channel) => (
                  <label key={channel}>
                    <input
                      type="checkbox"
                      checked={draftChannels.includes(channel)}
                      onChange={() => toggleDraftChannel(channel)}
                    />
                    {channel}
                  </label>
                ))}
              </div>
              <button type="submit" disabled={!draftTitle.trim() || !draftCaption.trim() || draftChannels.length === 0}>
                Add to publishing queue
              </button>
            </form>
          </section>
        </div>
      ) : null}

      {view === "permissions" ? (
        <section className={styles.card}>
          <div className={styles.cardHeader}>
            <div>
              <h2>Employee connection permissions</h2>
              <p>Access is scoped by employee and every high-impact action remains approval controlled.</p>
            </div>
          </div>
          <div className={styles.permissionTableWrap}>
            <table className={styles.permissionTable}>
              <thead>
                <tr>
                  <th>Connection</th>
                  <th>Employees</th>
                  <th>Capabilities</th>
                  <th>Approval rule</th>
                </tr>
              </thead>
              <tbody>
                {integrations.map((integration) => (
                  <tr key={integration.id}>
                    <td><strong>{integration.name}</strong><span>{statusLabel(integration.status)}</span></td>
                    <td>{integration.allowedEmployees.join(", ")}</td>
                    <td>{integration.capabilities.join(" · ")}</td>
                    <td>{integration.approvalRule}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}

      {view === "activity" ? (
        <section className={styles.card}>
          <div className={styles.cardHeader}>
            <div>
              <h2>Connections and publishing activity</h2>
              <p>This local development audit log records setup checks and publishing-queue actions.</p>
            </div>
          </div>
          <div className={styles.activityList}>
            {activity.length === 0 ? (
              <div className={styles.emptyState}>No integration activity has been recorded on this browser yet.</div>
            ) : activity.map((item) => (
              <article className={styles.activityItem} key={item.id}>
                <span className={`${styles.activityDot} ${styles[item.result]}`} />
                <div>
                  <strong>{item.action}: {item.subject}</strong>
                  <p>{item.detail}</p>
                  <small>{friendlyDate(item.createdAt)}</small>
                </div>
              </article>
            ))}
          </div>
        </section>
      ) : null}

      {selectedIntegration ? (
        <div className={styles.modalBackdrop} role="presentation" onClick={() => setSelectedIntegration(null)}>
          <section className={styles.modal} role="dialog" aria-modal="true" onClick={(event) => event.stopPropagation()}>
            <div className={styles.modalHeader}>
              <div>
                <span className={styles.providerIcon} style={{ color: selectedIntegration.color }}>
                  {selectedIntegration.icon}
                </span>
                <div>
                  <h2>{selectedIntegration.name}</h2>
                  <p>{statusLabel(selectedIntegration.status)}</p>
                </div>
              </div>
              <button type="button" onClick={() => setSelectedIntegration(null)}>×</button>
            </div>
            <p>{setupMessage || "RoyalOS is checking this connection."}</p>
            {selectedIntegration.requiredEnvironmentVariables.length ? (
              <div className={styles.environmentList}>
                <strong>Server environment variables</strong>
                {selectedIntegration.requiredEnvironmentVariables.map((key) => (
                  <code key={key}>{key}</code>
                ))}
              </div>
            ) : null}
            {selectedIntegration.callbackPath ? (
              <div className={styles.callbackBox}>
                <strong>Planned callback path</strong>
                <code>{selectedIntegration.callbackPath}</code>
              </div>
            ) : null}
            <div className={styles.safetyBox}>
              <strong>Approval protection</strong>
              <span>{selectedIntegration.approvalRule}</span>
            </div>
            <button type="button" className={styles.closeButton} onClick={() => setSelectedIntegration(null)}>
              Close
            </button>
          </section>
        </div>
      ) : null}
    </div>
  );
}
