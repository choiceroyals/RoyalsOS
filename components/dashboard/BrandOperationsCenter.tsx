"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { ROYALOS_EMPLOYEE_PROFILES } from "@/lib/employees/config";
import {
  BRAND_OPERATIONS_EVENT,
  addBrandEvent,
  addBrandPublishingJob,
  addBrandWebsite,
  createInitialBrandOperationsState,
  loadBrandOperationsState,
  mergeBrandConnections,
  removeBrandWebsite,
  saveBrandOperationsState,
  updateBrandPublishingJob,
  updateBrandWebsite,
} from "@/lib/brands/client";
import type {
  BrandConnection,
  BrandOperationsState,
  BrandProfile,
  BrandWebsite,
} from "@/lib/brands/types";
import SaveCompanyPdfButton from "@/components/reports/SaveCompanyPdfButton";
import {
  CORE_OPERATIONS_EVENT,
  createCoreApproval,
  loadCoreOperationsState,
  resolveCoreWorkspaceId,
  updateCoreApprovalStatus,
} from "@/lib/core-operations/storage";
import type { RoyalOSWorkspace } from "@/lib/missions/types";
import { createAndAssignSecurityIssue, loadSecurityState, saveSecurityState } from "@/lib/security/client";
import styles from "./BrandOperationsCenter.module.css";

type BrandView =
  | "directory"
  | "overview"
  | "connections"
  | "websites"
  | "employees"
  | "publishing"
  | "analytics"
  | "audit"
  | "settings";

type BrandApiResponse = {
  brand?: BrandProfile;
  connections?: BrandConnection[];
  error?: string;
};


const BRAND_VIEW_REQUEST_KEY = "royalos:brand-operations:requested-view";
const LEGACY_SOCIAL_QUEUE_KEY = "royalos.socialPublishingQueue.v1";
const LEGACY_SOCIAL_MIGRATION_KEY = "royalos:legacy-social-queue-migrated:v1";

const SOCIAL_PROVIDER_IDS = [
  "facebook",
  "instagram",
  "linkedin",
  "x",
  "tiktok",
  "youtube",
  "wordpress",
  "metricool",
];

function friendlyStatus(status: BrandConnection["status"]): string {
  return status
    .replaceAll("_", " ")
    .replace(/^./, (value) => value.toUpperCase());
}

function BrandLogo({
  brand,
  large = false,
}: {
  brand: BrandProfile;
  large?: boolean;
}) {
  const [failed, setFailed] = useState(false);
  return (
    <div
      className={`${styles.brandLogo} ${large ? styles.brandLogoLarge : ""}`}
      style={{ borderColor: brand.accentColor, background: brand.accentSoft }}
    >
      {!failed && brand.logoUrl ? (
        <img
          src={brand.logoUrl}
          alt={`${brand.name} logo`}
          onError={() => setFailed(true)}
        />
      ) : (
        <span style={{ color: brand.accentColor }}>
          {brand.name
            .split(/\s+/)
            .map((part) => part[0])
            .join("")
            .slice(0, 3)}
        </span>
      )}
    </div>
  );
}

type BrandOperationsCenterProps = {
  initialView?: BrandView;
  onOpenEmployees?: () => void;
};

export default function BrandOperationsCenter({
  initialView = "directory",
  onOpenEmployees,
}: BrandOperationsCenterProps) {
  const [state, setState] = useState<BrandOperationsState>(() =>
    createInitialBrandOperationsState(),
  );
  const [view, setView] = useState<BrandView>(initialView);
  const [loadingConnections, setLoadingConnections] = useState(false);
  const [connectionError, setConnectionError] = useState("");
  const [selectedConnection, setSelectedConnection] =
    useState<BrandConnection | null>(null);
  const [setupWizardOpen, setSetupWizardOpen] = useState(false);
  const [setupWizardIndex, setSetupWizardIndex] = useState(0);
  const [draftTitle, setDraftTitle] = useState("");
  const [draftCaption, setDraftCaption] = useState("");
  const [draftPlatforms, setDraftPlatforms] = useState<string[]>([
    "instagram",
    "facebook",
  ]);
  const [connectionNotice, setConnectionNotice] = useState("");
  const [connectionBusyProvider, setConnectionBusyProvider] = useState("");
  const [websiteModalOpen, setWebsiteModalOpen] = useState(false);
  const [websiteLabel, setWebsiteLabel] = useState("");
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [websiteKind, setWebsiteKind] =
    useState<BrandWebsite["kind"]>("main");
  const [websiteProvider, setWebsiteProvider] = useState("WordPress");
  const [websiteMessage, setWebsiteMessage] = useState("");
  const [checkingWebsiteId, setCheckingWebsiteId] = useState("");

  const selectedBrand =
    state.brands.find((brand) => brand.id === state.selectedBrandId) ??
    state.brands[0];

  function persist(next: BrandOperationsState) {
    setState(next);
    saveBrandOperationsState(next);
  }

  useEffect(() => {
    const refresh = () => setState(loadBrandOperationsState());
    const syncApprovals = () => {
      const operations = loadCoreOperationsState();
      const current = loadBrandOperationsState();
      let changed = false;
      const publishingJobs = current.publishingJobs.map((job) => {
        if (!job.approvalId) return job;
        const approval = operations.approvals.find((item) => item.id === job.approvalId);
        if (!approval) return job;
        const approvalStatus: BrandOperationsState["publishingJobs"][number]["approvalStatus"] =
          approval.status === "Approved"
            ? "approved"
            : approval.status === "Changes Requested"
              ? "changes_requested"
              : approval.status === "Pending"
                ? "awaiting_approval"
                : "draft";
        const publishStatus =
          approval.status === "Approved" && job.mediaStatus === "media_ready"
            ? "ready"
            : job.publishStatus;
        if (approvalStatus === job.approvalStatus && publishStatus === job.publishStatus) return job;
        changed = true;
        return { ...job, approvalStatus, publishStatus, updatedAt: new Date().toISOString() };
      });
      if (changed) saveBrandOperationsState({ ...current, publishingJobs });
    };
    window.addEventListener(BRAND_OPERATIONS_EVENT, refresh);
    window.addEventListener(CORE_OPERATIONS_EVENT, syncApprovals);
    const timer = window.setTimeout(() => {
      let current = loadBrandOperationsState();

      const requestedView = window.sessionStorage.getItem(BRAND_VIEW_REQUEST_KEY) as BrandView | null;
      if (requestedView) {
        setView(requestedView);
        window.sessionStorage.removeItem(BRAND_VIEW_REQUEST_KEY);
      }

      if (!window.localStorage.getItem(LEGACY_SOCIAL_MIGRATION_KEY)) {
        try {
          const raw = window.localStorage.getItem(LEGACY_SOCIAL_QUEUE_KEY);
          const legacy = raw ? (JSON.parse(raw) as Array<Record<string, unknown>>) : [];
          for (const item of legacy) {
            const title = typeof item.title === "string" ? item.title : "Cine publishing handoff";
            const caption = typeof item.caption === "string" ? item.caption : "";
            if (current.publishingJobs.some((job) => job.title === title && job.caption === caption)) continue;
            const workspace = typeof item.workspace === "string" ? item.workspace : "ChoiceRoyals";
            const brand = current.brands.find(
              (candidate) =>
                candidate.name.toLowerCase() === workspace.toLowerCase() ||
                candidate.legalName?.toLowerCase() === workspace.toLowerCase(),
            );
            current = addBrandPublishingJob(current, {
              brandId: brand?.id ?? current.selectedBrandId,
              title,
              platformIds: Array.isArray(item.channels)
                ? item.channels.filter((value): value is string => typeof value === "string").map((value) => value.toLowerCase())
                : ["instagram", "facebook"],
              contentType: typeof item.contentType === "string" ? item.contentType : "Video plan",
              caption,
              createdBy: item.sourceEmployee === "Emmy" ? "Emmy" : "Cine",
              approvalStatus: "draft",
              publishStatus: "not_ready",
              mediaStatus: "awaiting_media",
            });
          }
          saveBrandOperationsState(current);
          window.localStorage.setItem(LEGACY_SOCIAL_MIGRATION_KEY, "1");
        } catch {
          window.localStorage.setItem(LEGACY_SOCIAL_MIGRATION_KEY, "1");
        }
      }

      const params = new URLSearchParams(window.location.search);
      const requestedBrand = params.get("brand");
      const section = params.get("section");
      const callbackError = params.get("connectionError");
      const connectedProvider = params.get("connected");
      let next = current;

      if (
        requestedBrand &&
        current.brands.some((brand) => brand.id === requestedBrand)
      ) {
        next = { ...current, selectedBrandId: requestedBrand };
        setState(next);
        saveBrandOperationsState(next);
      } else {
        setState(current);
      }

      if (section?.toLowerCase() === "connections") setView("connections");
      if (callbackError) setConnectionError(callbackError);
      if (connectedProvider) {
        setConnectionNotice(
          `${connectedProvider} authorization was saved securely. RoyalOS is refreshing the brand connection status.`,
        );
      }

      if (callbackError || connectedProvider) {
        const cleanUrl = new URL(window.location.href);
        cleanUrl.searchParams.delete("connectionError");
        cleanUrl.searchParams.delete("connected");
        cleanUrl.searchParams.delete("provider");
        window.history.replaceState({}, "", `${cleanUrl.pathname}${cleanUrl.search}`);
      }
    }, 0);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener(BRAND_OPERATIONS_EVENT, refresh);
      window.removeEventListener(CORE_OPERATIONS_EVENT, syncApprovals);
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function loadConnections() {
      setLoadingConnections(true);
      setConnectionError("");
      try {
        const response = await fetch(
          `/api/brands?brandId=${encodeURIComponent(selectedBrand.id)}`,
          {
            cache: "no-store",
          },
        );
        const data = (await response.json()) as BrandApiResponse;
        if (!response.ok || !Array.isArray(data.connections)) {
          throw new Error(
            data.error || "RoyalOS could not load brand connections.",
          );
        }
        if (!cancelled) {
          // Keep React state updaters pure. saveBrandOperationsState dispatches a
          // cross-component browser event, so calling it from inside setState's
          // updater can update BrandSwitcher while BrandOperationsCenter is
          // rendering. Read the latest persisted snapshot, merge once, then
          // update and broadcast after the calculation is complete.
          const current = loadBrandOperationsState();
          const next = mergeBrandConnections(
            current,
            data.connections ?? [],
          );
          setState(next);
          saveBrandOperationsState(next);
        }
      } catch (error) {
        if (!cancelled) {
          setConnectionError(
            error instanceof Error
              ? error.message
              : "RoyalOS could not load brand connections.",
          );
        }
      } finally {
        if (!cancelled) setLoadingConnections(false);
      }
    }
    void loadConnections();
    return () => {
      cancelled = true;
    };
  }, [selectedBrand.id]);

  const brandConnections = useMemo(
    () =>
      state.connections.filter(
        (connection) => connection.brandId === selectedBrand.id,
      ),
    [selectedBrand.id, state.connections],
  );
  const brandWebsites = useMemo(
    () =>
      state.websites.filter((website) => website.brandId === selectedBrand.id),
    [selectedBrand.id, state.websites],
  );
  const brandAssignments = useMemo(
    () =>
      state.assignments.filter(
        (assignment) => assignment.brandId === selectedBrand.id,
      ),
    [selectedBrand.id, state.assignments],
  );
  const publishingJobs = useMemo(
    () =>
      state.publishingJobs.filter((job) => job.brandId === selectedBrand.id),
    [selectedBrand.id, state.publishingJobs],
  );
  const brandEvents = useMemo(
    () => state.events.filter((event) => event.brandId === selectedBrand.id),
    [selectedBrand.id, state.events],
  );

  const metrics = useMemo(() => {
    const social = brandConnections.filter((item) =>
      SOCIAL_PROVIDER_IDS.includes(item.providerId),
    );
    return {
      connected: brandConnections.filter((item) => item.status === "connected")
        .length,
      socialConnected: social.filter((item) => item.status === "connected")
        .length,
      needsSetup: brandConnections.filter(
        (item) => item.status === "setup_required",
      ).length,
      assignedEmployees: new Set(brandAssignments.map((item) => item.employee))
        .size,
      scheduled: publishingJobs.filter(
        (item) => item.publishStatus === "scheduled",
      ).length,
    };
  }, [brandAssignments, brandConnections, publishingJobs]);

  function selectBrand(brandId: string, nextView: BrandView = "overview") {
    persist({ ...state, selectedBrandId: brandId });
    setView(nextView);
  }

  function inspectConnection(connection: BrandConnection) {
    setSelectedConnection(connection);
    persist(
      addBrandEvent(state, {
        brandId: selectedBrand.id,
        providerId: connection.providerId,
        action: "Connection inspected",
        actor: "Ayobami",
        result: connection.status === "connected" ? "success" : "information",
        detail: `${connection.providerName} configuration was reviewed for ${selectedBrand.name}.`,
      }),
    );
  }

  function togglePlatform(providerId: string) {
    setDraftPlatforms((previous) =>
      previous.includes(providerId)
        ? previous.filter((item) => item !== providerId)
        : [...previous, providerId],
    );
  }

  function requestPublishingApproval(job: BrandOperationsState["publishingJobs"][number]) {
    const approval = createCoreApproval({
      title: `Approve publishing: ${job.title}`,
      kind: "Social publishing",
      workspaceId: resolveCoreWorkspaceId(selectedBrand.name),
      requestedBy: "Emmy",
      targetEmployee: "Emmy",
      sourceType: "brand_publishing_job",
      sourceId: job.id,
      summary: `${job.caption} Platforms: ${job.platformIds.join(", ")}. Media status: ${job.mediaStatus ?? "not provided"}.`,
      metadata: { brandId: job.brandId, platformIds: job.platformIds, assetUrl: job.assetUrl },
    });
    persist(
      updateBrandPublishingJob(state, job.id, {
        approvalId: approval.id,
        approvalStatus: "awaiting_approval",
      }),
    );
  }

  function approvePublishingJob(job: BrandOperationsState["publishingJobs"][number]) {
    if (job.approvalId) updateCoreApprovalStatus(job.approvalId, "Approved");
    persist(
      updateBrandPublishingJob(state, job.id, {
        approvalStatus: "approved",
        publishStatus: job.mediaStatus === "media_ready" ? "ready" : "not_ready",
      }),
    );
  }

  function createPublishingJob(event: FormEvent) {
    event.preventDefault();
    if (
      !draftTitle.trim() ||
      !draftCaption.trim() ||
      draftPlatforms.length === 0
    )
      return;
    const next = addBrandPublishingJob(state, {
      brandId: selectedBrand.id,
      title: draftTitle.trim(),
      platformIds: draftPlatforms,
      contentType: "Social content",
      caption: draftCaption.trim(),
      createdBy: "Emmy",
      approvalStatus: "draft",
      publishStatus: "not_ready",
    });
    persist(next);
    setDraftTitle("");
    setDraftCaption("");
  }

  async function refreshConnectionStatuses(showNotice = true) {
    setLoadingConnections(true);
    setConnectionError("");
    try {
      const response = await fetch(
        `/api/brands?brandId=${encodeURIComponent(selectedBrand.id)}`,
        { cache: "no-store" },
      );
      const data = (await response.json()) as BrandApiResponse;
      if (!response.ok || !Array.isArray(data.connections)) {
        throw new Error(
          data.error || "RoyalOS could not refresh brand connections.",
        );
      }
      const current = loadBrandOperationsState();
      const next = mergeBrandConnections(current, data.connections);
      setState(next);
      saveBrandOperationsState(next);
      if (showNotice) {
        setConnectionNotice(
          "Connection status refreshed from the private server configuration and encrypted credential vault.",
        );
      }
    } catch (error) {
      setConnectionError(
        error instanceof Error
          ? error.message
          : "RoyalOS could not refresh brand connections.",
      );
    } finally {
      setLoadingConnections(false);
    }
  }

  async function openOAuth(connection: BrandConnection) {
    if (!connection.callbackPath) {
      setSelectedConnection(connection);
      return;
    }

    setConnectionBusyProvider(connection.providerId);
    setConnectionError("");
    setConnectionNotice("");

    try {
      const preflight = new URL(connection.callbackPath, window.location.origin);
      preflight.searchParams.set("mode", "check");
      const response = await fetch(preflight.toString(), { cache: "no-store" });
      const data = (await response.json()) as {
        ready?: boolean;
        message?: string;
        issues?: string[];
        missingEnvironmentVariables?: string[];
        error?: string;
      };

      if (!response.ok || !data.ready) {
        const issues = data.issues ?? data.missingEnvironmentVariables ?? [];
        setSelectedConnection({
          ...connection,
          missingEnvironmentVariables:
            data.missingEnvironmentVariables ??
            connection.missingEnvironmentVariables,
        });
        setConnectionError(
          issues.length > 0
            ? `Complete setup before authorization: ${issues.join("; ")}`
            : data.error || data.message || "Provider setup is incomplete.",
        );
        return;
      }

      window.location.assign(connection.callbackPath);
    } catch (error) {
      setConnectionError(
        error instanceof Error
          ? error.message
          : "RoyalOS could not start secure authorization.",
      );
      setSelectedConnection(connection);
    } finally {
      setConnectionBusyProvider("");
    }
  }

  function openAddWebsite() {
    setWebsiteLabel("");
    setWebsiteUrl(
      selectedBrand.primaryDomain && selectedBrand.primaryDomain.trim()
        ? selectedBrand.primaryDomain
        : "https://",
    );
    setWebsiteKind("main");
    setWebsiteProvider("WordPress");
    setWebsiteMessage("");
    setWebsiteModalOpen(true);
  }

  function submitWebsite(event: FormEvent) {
    event.preventDefault();
    setWebsiteMessage("");

    let normalizedUrl = websiteUrl.trim();
    if (!/^https?:\/\//i.test(normalizedUrl)) {
      normalizedUrl = `https://${normalizedUrl}`;
    }

    try {
      const parsed = new URL(normalizedUrl);
      if (!["http:", "https:"].includes(parsed.protocol)) {
        throw new Error("Only HTTP and HTTPS website addresses are supported.");
      }
      const next = addBrandWebsite(state, {
        brandId: selectedBrand.id,
        label: websiteLabel.trim() || parsed.hostname,
        url: parsed.toString().replace(/\/$/, ""),
        kind: websiteKind,
        provider: websiteProvider.trim() || "Custom",
        assignedEmployees: ["Orion", "Sentinel"],
      });
      persist(next);
      setWebsiteModalOpen(false);
      setWebsiteMessage("Website added to the brand registry.");
    } catch (error) {
      setWebsiteMessage(
        error instanceof Error ? error.message : "Enter a valid website URL.",
      );
    }
  }

  async function runWebsiteHealthCheck(website: BrandWebsite) {
    setCheckingWebsiteId(website.id);
    setWebsiteMessage("");
    try {
      const response = await fetch("/api/brands/websites/health", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: website.url }),
      });
      const data = (await response.json()) as {
        health?: BrandWebsite["health"];
        sslStatus?: BrandWebsite["sslStatus"];
        checkedAt?: string;
        message?: string;
        error?: string;
      };
      if (!response.ok || !data.health) {
        throw new Error(data.error || "Website health check failed.");
      }
      let next = updateBrandWebsite(state, website.id, {
        health: data.health,
        sslStatus: data.sslStatus ?? "not_checked",
        lastCheckedAt: data.checkedAt ?? new Date().toISOString(),
      });
      next = addBrandEvent(next, {
        brandId: selectedBrand.id,
        action: "Website health checked",
        actor: "Sentinel",
        result: data.health === "healthy" ? "success" : "warning",
        detail: `${website.label}: ${data.message || data.health}.`,
      });
      persist(next);
      setWebsiteMessage(data.message || "Website health check completed.");
    } catch (error) {
      let next = updateBrandWebsite(state, website.id, {
        health: "offline",
        lastCheckedAt: new Date().toISOString(),
      });
      next = addBrandEvent(next, {
        brandId: selectedBrand.id,
        action: "Website health check failed",
        actor: "Sentinel",
        result: "error",
        detail:
          error instanceof Error ? error.message : "Website health check failed.",
      });
      persist(next);
      setWebsiteMessage(
        error instanceof Error ? error.message : "Website health check failed.",
      );
    } finally {
      setCheckingWebsiteId("");
    }
  }

  function assignSentinel(website: BrandWebsite) {
    let next = state;
    if (!website.assignedEmployees.includes("Sentinel")) {
      next = updateBrandWebsite(next, website.id, {
        assignedEmployees: [...website.assignedEmployees, "Sentinel"],
      });
      next = addBrandEvent(next, {
        brandId: selectedBrand.id,
        action: "Sentinel assigned",
        actor: "Ayobami",
        result: "success",
        detail: `Sentinel was assigned to monitor ${website.label}.`,
      });
      persist(next);
    }

    const security = createAndAssignSecurityIssue(loadSecurityState(), {
      brandId: selectedBrand.id,
      title: `Review ${website.label} website security and health`,
      platform: website.label,
      summary: `Sentinel was assigned to review ${website.url}, its latest health status (${website.health}), SSL status (${website.sslStatus}), administrator access, platform telemetry, and recommended improvements.`,
      severity: website.health === "offline" ? "high" : "medium",
      evidence: `${website.url} | provider: ${website.provider} | last check: ${website.lastCheckedAt || "not checked"}`,
      ruleId: website.health === "offline" ? "rule-site-offline" : "rule-platform-review",
    });
    saveSecurityState(security.state);
    setWebsiteMessage(`Sentinel accepted ${website.label}. Incident created in Security & Audit.`);
  }

  return (
    <div className={styles.center}>
      <section
        className={styles.hero}
        style={
          { "--brand-accent": selectedBrand.accentColor } as React.CSSProperties
        }
      >
        <div className={styles.heroIdentity}>
          <BrandLogo brand={selectedBrand} large />
          <div>
            <span className={styles.eyebrow}>
              RoyalOS brand operating system
            </span>
            <h1>{selectedBrand.name}</h1>
            <p>{selectedBrand.description}</p>
            <small>{selectedBrand.missionStatement}</small>
          </div>
        </div>
        <label className={styles.brandSelect}>
          <span>Active brand</span>
          <select
            value={selectedBrand.id}
            onChange={(event) => selectBrand(event.target.value)}
          >
            {state.brands.map((brand) => (
              <option key={brand.id} value={brand.id}>
                {brand.name}
              </option>
            ))}
          </select>
        </label>
      </section>

      <nav className={styles.tabs} aria-label="Brand operating sections">
        {(
          [
            ["directory", "Brands"],
            ["overview", "Overview"],
            ["connections", "Connections"],
            ["websites", "Websites"],
            ["employees", "Employees"],
            ["publishing", "Publishing"],
            ["analytics", "Analytics"],
            ["audit", "Audit"],
            ["settings", "Settings"],
          ] as const
        ).map(([id, label]) => (
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

      {view === "directory" ? (
        <section className={styles.directoryGrid}>
          {state.brands.map((brand) => {
            const connections = state.connections.filter(
              (item) => item.brandId === brand.id,
            );
            const connected = connections.filter(
              (item) => item.status === "connected",
            ).length;
            const assignments = state.assignments.filter(
              (item) => item.brandId === brand.id,
            );
            return (
              <article
                key={brand.id}
                className={styles.brandCard}
                style={
                  { "--brand-accent": brand.accentColor } as React.CSSProperties
                }
              >
                <div className={styles.brandCardTop}>
                  <BrandLogo brand={brand} />
                  <span
                    className={`${styles.statusPill} ${styles[brand.status]}`}
                  >
                    {brand.status}
                  </span>
                </div>
                <h2>{brand.name}</h2>
                <p>{brand.description}</p>
                <div className={styles.cardFacts}>
                  <span>
                    <b>{connected}</b> connected platforms
                  </span>
                  <span>
                    <b>{assignments.length}</b> employee assignments
                  </span>
                  <span>{brand.primaryDomain || "Domain not added"}</span>
                </div>
                <div className={styles.cardActions}>
                  <button
                    type="button"
                    onClick={() => selectBrand(brand.id, "overview")}
                  >
                    Open brand
                  </button>
                  <button
                    type="button"
                    onClick={() => selectBrand(brand.id, "connections")}
                  >
                    Connections
                  </button>
                </div>
              </article>
            );
          })}
        </section>
      ) : null}

      {view === "overview" ? (
        <div className={styles.stack}>
          <section className={styles.metricGrid}>
            <article>
              <strong>{metrics.connected}</strong>
              <span>Connected platforms</span>
            </article>
            <article>
              <strong>{metrics.socialConnected}</strong>
              <span>Social accounts online</span>
            </article>
            <article>
              <strong>{metrics.assignedEmployees}</strong>
              <span>Assigned employees</span>
            </article>
            <article>
              <strong>{publishingJobs.length}</strong>
              <span>Publishing jobs</span>
            </article>
            <article>
              <strong>{brandWebsites.length}</strong>
              <span>Registered websites</span>
            </article>
          </section>
          <section className={styles.twoColumn}>
            <article className={styles.panel}>
              <div className={styles.panelHeader}>
                <div>
                  <span>Executive snapshot</span>
                  <h2>Brand health</h2>
                </div>
                <button type="button" onClick={() => setView("connections")}>
                  Manage platforms
                </button>
              </div>
              <div className={styles.healthList}>
                <div>
                  <span>Connection health</span>
                  <b>
                    {metrics.needsSetup === 0
                      ? "Ready"
                      : `${metrics.needsSetup} need setup`}
                  </b>
                </div>
                <div>
                  <span>Publishing approvals</span>
                  <b>
                    {
                      publishingJobs.filter(
                        (item) => item.approvalStatus === "awaiting_approval",
                      ).length
                    }
                  </b>
                </div>
                <div>
                  <span>Metricool</span>
                  <b>
                    {brandConnections.find(
                      (item) => item.providerId === "metricool",
                    )?.status ?? "setup required"}
                  </b>
                </div>
                <div>
                  <span>Website monitoring</span>
                  <b>
                    {brandWebsites.length ? "Registered" : "Not configured"}
                  </b>
                </div>
              </div>
            </article>
            <article className={styles.panel}>
              <div className={styles.panelHeader}>
                <div>
                  <span>Senior team</span>
                  <h2>Brand leadership</h2>
                </div>
                <button type="button" onClick={() => setView("employees")}>
                  View assignments
                </button>
              </div>
              <div className={styles.employeeMiniGrid}>
                {brandAssignments.slice(0, 6).map((assignment) => {
                  const employee = ROYALOS_EMPLOYEE_PROFILES.find(
                    (item) => item.name === assignment.employee,
                  );
                  return (
                    <div key={assignment.id}>
                      <span>
                        {employee?.initials ?? assignment.employee.slice(0, 2)}
                      </span>
                      <div>
                        <b>{assignment.employee}</b>
                        <small>{employee?.shortRole}</small>
                      </div>
                    </div>
                  );
                })}
              </div>
            </article>
          </section>
        </div>
      ) : null}

      {view === "connections" ? (
        <div className={styles.stack}>
          <section className={styles.connectionSummary}>
            <div>
              <h2>All platforms for {selectedBrand.name}</h2>
              <p>
                Each brand has its own account records and Metricool
                identifiers. OAuth tokens are encrypted server-side; passwords
                are never stored in browser code.
              </p>
            </div>
            <div className={styles.cardActions}>
              <button
                type="button"
                onClick={() => void refreshConnectionStatuses()}
                disabled={loadingConnections}
              >
                {loadingConnections ? "Refreshing…" : "Refresh status"}
              </button>
              <button
                type="button"
                onClick={() => {
                  setSetupWizardIndex(0);
                  setSetupWizardOpen(true);
                }}
              >
                Set up brand connections
              </button>
            </div>
          </section>
          {connectionError ? (
            <div className={styles.error}>{connectionError}</div>
          ) : null}
          {connectionNotice ? (
            <div className={styles.successNotice}>{connectionNotice}</div>
          ) : null}
          {loadingConnections ? (
            <div className={styles.loading}>
              Checking provider and brand configuration…
            </div>
          ) : null}
          <section
            className={styles.connectionGrid}
            id="brand-connections-grid"
          >
            {brandConnections.map((connection) => {
              const provider = connection.providerId;
              const integration = provider;
              const canOAuth = Boolean(connection.callbackPath);
              return (
                <article key={connection.id} className={styles.connectionCard}>
                  <div className={styles.connectionCardTop}>
                    <span className={styles.providerMark}>
                      {connection.providerName.slice(0, 2).toUpperCase()}
                    </span>
                    <span
                      className={`${styles.connectionState} ${styles[connection.status]}`}
                    >
                      {friendlyStatus(connection.status)}
                    </span>
                  </div>
                  <h3>{connection.providerName}</h3>
                  <p>{connection.lastAction}</p>
                  <div className={styles.permissionTags}>
                    {connection.permissions.slice(0, 3).map((permission) => (
                      <span key={permission}>{permission}</span>
                    ))}
                  </div>
                  <small>
                    {connection.assignedEmployees.slice(0, 4).join(", ")}
                  </small>
                  <div className={styles.cardActions}>
                    <button
                      type="button"
                      onClick={() => inspectConnection(connection)}
                    >
                      Details
                    </button>
                    <button
                      type="button"
                      disabled={connectionBusyProvider === connection.providerId}
                      onClick={() => {
                        if (canOAuth && connection.missingEnvironmentVariables.length === 0) {
                          void openOAuth(connection);
                        } else {
                          setSelectedConnection(connection);
                        }
                      }}
                    >
                      {connectionBusyProvider === connection.providerId
                        ? "Checking…"
                        : connection.status === "connected"
                          ? "Reconnect"
                          : canOAuth && connection.missingEnvironmentVariables.length === 0
                            ? "Authorize"
                            : "View setup"}
                    </button>
                  </div>
                  <code className={styles.connectionId}>
                    {selectedBrand.slug}:{integration}
                  </code>
                </article>
              );
            })}
          </section>
        </div>
      ) : null}

      {view === "websites" ? (
        <section className={styles.panel}>
          <div className={styles.panelHeader}>
            <div>
              <span>Brand web estate</span>
              <h2>Websites and applications</h2>
            </div>
            <button type="button" onClick={openAddWebsite}>Add website</button>
          </div>
          {websiteMessage ? (
            <div className={styles.successNotice}>{websiteMessage}</div>
          ) : null}
          <div className={styles.websiteList}>
            {brandWebsites.length === 0 ? (
              <div className={styles.empty}>
                No website records have been added for this brand yet.
              </div>
            ) : (
              brandWebsites.map((website) => (
                <article key={website.id}>
                  <div>
                    <span className={styles.siteIcon}>⌘</span>
                    <div>
                      <b>{website.label}</b>
                      <a href={website.url} target="_blank" rel="noreferrer">
                        {website.url}
                      </a>
                    </div>
                  </div>
                  <span>{website.provider}</span>
                  <span className={styles.healthBadge}>
                    {website.health.replaceAll("_", " ")}
                  </span>
                  <small>{website.assignedEmployees.join(", ")}</small>
                  <div className={styles.rowActions}>
                    <a href={website.url} target="_blank" rel="noreferrer">
                      Open
                    </a>
                    <button
                      type="button"
                      disabled={checkingWebsiteId === website.id}
                      onClick={() => void runWebsiteHealthCheck(website)}
                    >
                      {checkingWebsiteId === website.id
                        ? "Checking…"
                        : "Run health check"}
                    </button>
                    <button type="button" onClick={() => assignSentinel(website)}>
                      {website.assignedEmployees.includes("Sentinel")
                        ? "Sentinel assigned"
                        : "Assign Sentinel"}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (window.confirm(`Remove ${website.label} from this brand?`)) {
                          persist(removeBrandWebsite(state, website.id));
                        }
                      }}
                    >
                      Remove
                    </button>
                  </div>
                </article>
              ))
            )}
          </div>
        </section>
      ) : null}

      {view === "employees" ? (
        <section className={styles.panel}>
          <div className={styles.panelHeader}>
            <div>
              <span>Scoped workforce access</span>
              <h2>Employees assigned to {selectedBrand.name}</h2>
            </div>
            <button type="button" onClick={onOpenEmployees} disabled={!onOpenEmployees}>Open employee directory</button>
          </div>
          <div className={styles.assignmentGrid}>
            {brandAssignments.map((assignment) => {
              const employee = ROYALOS_EMPLOYEE_PROFILES.find(
                (item) => item.name === assignment.employee,
              );
              return (
                <article key={assignment.id}>
                  <div className={styles.assignmentTitle}>
                    <span>
                      {employee?.initials ?? assignment.employee.slice(0, 2)}
                    </span>
                    <div>
                      <h3>{assignment.employee}</h3>
                      <small>{employee?.title}</small>
                    </div>
                  </div>
                  <p>{assignment.responsibility}</p>
                  <div className={styles.permissionMatrix}>
                    <span>
                      Draft <b>{assignment.canDraft ? "Yes" : "No"}</b>
                    </span>
                    <span>
                      Schedule <b>{assignment.canSchedule ? "Yes" : "No"}</b>
                    </span>
                    <span>
                      Publish{" "}
                      <b>{assignment.canPublish ? "Yes" : "Approval"}</b>
                    </span>
                    <span>
                      Analytics{" "}
                      <b>{assignment.canReadAnalytics ? "Yes" : "No"}</b>
                    </span>
                  </div>
                  <small>{assignment.platformIds.join(" · ")}</small>
                  <button type="button" onClick={onOpenEmployees} disabled={!onOpenEmployees}>Assign task directly</button>
                </article>
              );
            })}
          </div>
        </section>
      ) : null}

      {view === "publishing" ? (
        <div className={styles.twoColumn}>
          <section className={styles.panel}>
            <div className={styles.panelHeader}>
              <div>
                <span>Emmy publishing queue</span>
                <h2>{selectedBrand.name} content</h2>
              </div>
            </div>
            <div className={styles.publishingList}>
              {publishingJobs.length === 0 ? (
                <div className={styles.empty}>
                  No brand publishing jobs yet.
                </div>
              ) : (
                publishingJobs.map((job) => (
                  <article key={job.id}>
                    <div>
                      <b>{job.title}</b>
                      <small>
                        {job.createdBy} · {job.updatedAt.slice(0, 10)}
                      </small>
                    </div>
                    <p>{job.caption}</p>
                    <div className={styles.permissionTags}>
                      <span>Media: {job.mediaStatus === "media_ready" ? "ready" : "awaiting media"}</span>
                      <span>Approval: {job.approvalStatus.replaceAll("_", " ")}</span>
                    </div>
                    {job.assetUrl ? (
                      <a href={job.assetUrl} target="_blank" rel="noreferrer">Open attached video</a>
                    ) : null}
                    <div className={styles.permissionTags}>
                      {job.platformIds.map((id) => (
                        <span key={id}>{id}</span>
                      ))}
                    </div>
                    <div className={styles.rowActions}>
                      <button
                        type="button"
                        onClick={() => requestPublishingApproval(job)}
                        disabled={job.approvalStatus === "awaiting_approval" || job.approvalStatus === "approved"}
                      >
                        {job.approvalStatus === "awaiting_approval" ? "Approval pending" : "Request approval"}
                      </button>
                      <button
                        type="button"
                        onClick={() => approvePublishingJob(job)}
                        disabled={job.approvalStatus === "approved"}
                      >
                        {job.approvalStatus === "approved" ? "CEO approved" : "CEO approve"}
                      </button>
                      <button
                        type="button"
                        disabled={job.publishStatus !== "ready"}
                      >
                        Publish
                      </button>
                    </div>
                  </article>
                ))
              )}
            </div>
          </section>
          <section className={styles.panel}>
            <div className={styles.panelHeader}>
              <div>
                <span>Create</span>
                <h2>New publishing job</h2>
              </div>
            </div>
            <form className={styles.form} onSubmit={createPublishingJob}>
              <label>
                <span>Title</span>
                <input
                  value={draftTitle}
                  onChange={(event) => setDraftTitle(event.target.value)}
                  placeholder="Campaign or post title"
                />
              </label>
              <label>
                <span>Caption or brief</span>
                <textarea
                  value={draftCaption}
                  onChange={(event) => setDraftCaption(event.target.value)}
                  placeholder="Write the approved content brief or caption."
                />
              </label>
              <div className={styles.platformPicker}>
                {SOCIAL_PROVIDER_IDS.map((provider) => (
                  <label key={provider}>
                    <input
                      type="checkbox"
                      checked={draftPlatforms.includes(provider)}
                      onChange={() => togglePlatform(provider)}
                    />
                    {provider}
                  </label>
                ))}
              </div>
              <button type="submit">Add to brand queue</button>
            </form>
          </section>
        </div>
      ) : null}

      {view === "analytics" ? (
        <div className={styles.stack}>
          <section className={styles.metricGrid}>
            <article>
              <strong>{metrics.connected}</strong>
              <span>Connections online</span>
            </article>
            <article>
              <strong>{brandEvents.length}</strong>
              <span>Audit events</span>
            </article>
            <article>
              <strong>{metrics.scheduled}</strong>
              <span>Scheduled posts</span>
            </article>
            <article>
              <strong>
                {
                  publishingJobs.filter(
                    (item) => item.publishStatus === "failed",
                  ).length
                }
              </strong>
              <span>Failed publishing</span>
            </article>
          </section>
          <section className={styles.panel}>
            <div className={styles.panelHeader}>
              <div>
                <span>Executive reporting</span>
                <h2>Brand analytics foundation</h2>
              </div>
              <SaveCompanyPdfButton
                defaultTitle={`${selectedBrand.name} Brand & Platform Report`}
                workspace={selectedBrand.name as RoyalOSWorkspace}
                employee="Tyson"
                content={`Brand: ${selectedBrand.name}\nConnected platforms: ${metrics.connected}\nSocial connections: ${metrics.socialConnected}\nAssigned employees: ${metrics.assignedEmployees}\nPublishing jobs: ${publishingJobs.length}\nRegistered websites: ${brandWebsites.length}\n\nRecommendations:\n- Complete missing platform authorization.\n- Review employee permissions quarterly.\n- Preserve approval and publishing audit records.\n- Connect analytics adapters before relying on performance totals.`}
              />
            </div>
            <div className={styles.analyticsPlaceholder}>
              <b>
                Live metrics will appear when provider analytics APIs are
                authorized.
              </b>
              <p>
                RoyalOS does not invent follower counts, engagement, revenue,
                website traffic, or campaign performance.
              </p>
            </div>
          </section>
        </div>
      ) : null}

      {view === "audit" ? (
        <section className={styles.panel}>
          <div className={styles.panelHeader}>
            <div>
              <span>Evidence and accountability</span>
              <h2>Brand connection audit trail</h2>
            </div>
          </div>
          <div className={styles.auditList}>
            {brandEvents.length === 0 ? (
              <div className={styles.empty}>
                No brand-specific audit events have been recorded in this
                browser.
              </div>
            ) : (
              brandEvents.map((event) => (
                <article key={event.id}>
                  <span
                    className={`${styles.auditDot} ${styles[event.result]}`}
                  />
                  <div>
                    <b>{event.action}</b>
                    <p>{event.detail}</p>
                    <small>
                      {event.actor} ·{" "}
                      {new Date(event.createdAt).toLocaleString()}
                    </small>
                  </div>
                </article>
              ))
            )}
          </div>
        </section>
      ) : null}

      {view === "settings" ? (
        <section className={styles.panel}>
          <div className={styles.panelHeader}>
            <div>
              <span>Brand configuration</span>
              <h2>{selectedBrand.name} settings</h2>
            </div>
          </div>
          <div className={styles.settingsGrid}>
            <label>
              <span>Brand name</span>
              <input value={selectedBrand.name} readOnly />
            </label>
            <label>
              <span>Primary domain</span>
              <input value={selectedBrand.primaryDomain ?? ""} readOnly />
            </label>
            <label>
              <span>Workspace</span>
              <input value={selectedBrand.workspaceId} readOnly />
            </label>
            <label>
              <span>Metricool configuration</span>
              <input
                value={`${selectedBrand.slug.toUpperCase().replaceAll("-", "_")}_METRICOOL_*`}
                readOnly
              />
            </label>
          </div>
          <div className={styles.securityNotice}>
            <b>Credentials are not edited here.</b>
            <p>
              OAuth credentials belong to provider developer applications.
              Per-brand API tokens and identifiers belong in the private server
              environment or encrypted Supabase credential vault.
            </p>
          </div>
        </section>
      ) : null}

      {websiteModalOpen ? (
        <div
          className={styles.modalBackdrop}
          onClick={() => setWebsiteModalOpen(false)}
        >
          <section
            className={styles.modal}
            onClick={(event) => event.stopPropagation()}
          >
            <div className={styles.modalHeader}>
              <div>
                <span>WEB</span>
                <div>
                  <h2>Add website or application</h2>
                  <p>{selectedBrand.name}</p>
                </div>
              </div>
              <button type="button" onClick={() => setWebsiteModalOpen(false)}>
                ×
              </button>
            </div>
            <form className={styles.form} onSubmit={submitWebsite}>
              <label>
                <span>Display name</span>
                <input
                  value={websiteLabel}
                  onChange={(event) => setWebsiteLabel(event.target.value)}
                  placeholder="Main Website"
                />
              </label>
              <label>
                <span>Website URL</span>
                <input
                  value={websiteUrl}
                  onChange={(event) => setWebsiteUrl(event.target.value)}
                  placeholder="https://example.com"
                  required
                />
              </label>
              <div className={styles.settingsGrid}>
                <label>
                  <span>Website type</span>
                  <select
                    value={websiteKind}
                    onChange={(event) =>
                      setWebsiteKind(event.target.value as BrandWebsite["kind"])
                    }
                  >
                    <option value="main">Main website</option>
                    <option value="shop">Shop</option>
                    <option value="community">Community</option>
                    <option value="academy">Academy</option>
                    <option value="blog">Blog</option>
                    <option value="admin">Admin portal</option>
                    <option value="api">API</option>
                  </select>
                </label>
                <label>
                  <span>Platform/provider</span>
                  <select
                    value={websiteProvider}
                    onChange={(event) => setWebsiteProvider(event.target.value)}
                  >
                    <option>WordPress</option>
                    <option>Next.js</option>
                    <option>Shopify</option>
                    <option>Wix</option>
                    <option>Squarespace</option>
                    <option>Custom</option>
                    <option>Other</option>
                  </select>
                </label>
              </div>
              {websiteMessage ? (
                <div className={styles.error}>{websiteMessage}</div>
              ) : null}
              <div className={styles.modalActions}>
                <button type="submit">Add website</button>
                <button type="button" onClick={() => setWebsiteModalOpen(false)}>
                  Cancel
                </button>
              </div>
            </form>
          </section>
        </div>
      ) : null}

      {setupWizardOpen ? (
        <div
          className={styles.modalBackdrop}
          onClick={() => setSetupWizardOpen(false)}
        >
          <section
            className={styles.modal}
            onClick={(event) => event.stopPropagation()}
          >
            {(() => {
              const connection = brandConnections[setupWizardIndex];
              if (!connection) {
                return (
                  <>
                    <div className={styles.modalHeader}>
                      <div>
                        <span>✓</span>
                        <div>
                          <h2>Connection review complete</h2>
                          <p>{selectedBrand.name}</p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setSetupWizardOpen(false)}
                      >
                        ×
                      </button>
                    </div>
                    <div className={styles.securityNotice}>
                      <b>RoyalOS checked every configured platform.</b>
                      <p>
                        Platforms still marked Setup Required need developer
                        credentials or account authorization. Connected
                        platforms are available to approved employees under
                        their scoped permissions.
                      </p>
                    </div>
                    <div className={styles.modalActions}>
                      <button
                        type="button"
                        onClick={() => setSetupWizardOpen(false)}
                      >
                        Finish
                      </button>
                    </div>
                  </>
                );
              }
              const canOAuth = Boolean(connection.callbackPath);
              return (
                <>
                  <div className={styles.modalHeader}>
                    <div>
                      <span>
                        {connection.providerName.slice(0, 2).toUpperCase()}
                      </span>
                      <div>
                        <h2>{connection.providerName}</h2>
                        <p>
                          {selectedBrand.name} · {setupWizardIndex + 1} of{" "}
                          {brandConnections.length}
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setSetupWizardOpen(false)}
                    >
                      ×
                    </button>
                  </div>
                  <div className={styles.modalStatus}>
                    <b>{friendlyStatus(connection.status)}</b>
                    <span>{connection.lastAction}</span>
                  </div>
                  <div className={styles.environmentList}>
                    <b>Required private configuration</b>
                    {connection.requiredEnvironmentVariables.length === 0 ? (
                      <span>
                        This provider is planned or uses a connection flow
                        without local variables.
                      </span>
                    ) : (
                      connection.requiredEnvironmentVariables.map((key) => (
                        <code
                          className={
                            connection.missingEnvironmentVariables.includes(key)
                              ? styles.missingKey
                              : ""
                          }
                          key={key}
                        >
                          {key}=
                        </code>
                      ))
                    )}
                  </div>
                  <div className={styles.securityNotice}>
                    <b>Guided setup</b>
                    <p>
                      RoyalOS cannot reuse one password across independent
                      platforms. Authorize each provider once; afterward all
                      accounts for this brand appear together inside RoyalOS.
                    </p>
                  </div>
                  <div className={styles.modalActions}>
                    <button
                      type="button"
                      disabled={setupWizardIndex === 0}
                      onClick={() =>
                        setSetupWizardIndex((value) => Math.max(0, value - 1))
                      }
                    >
                      Back
                    </button>
                    {canOAuth ? (
                      <button
                        type="button"
                        onClick={() => openOAuth(connection)}
                      >
                        Authorize {connection.providerName}
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setSelectedConnection(connection)}
                      >
                        View setup
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => setSetupWizardIndex((value) => value + 1)}
                    >
                      Next
                    </button>
                  </div>
                </>
              );
            })()}
          </section>
        </div>
      ) : null}

      {selectedConnection ? (
        <div
          className={styles.modalBackdrop}
          onClick={() => setSelectedConnection(null)}
        >
          <section
            className={styles.modal}
            onClick={(event) => event.stopPropagation()}
          >
            <div className={styles.modalHeader}>
              <div>
                <span>
                  {selectedConnection.providerName.slice(0, 2).toUpperCase()}
                </span>
                <div>
                  <h2>{selectedConnection.providerName}</h2>
                  <p>{selectedBrand.name}</p>
                </div>
              </div>
              <button type="button" onClick={() => setSelectedConnection(null)}>
                ×
              </button>
            </div>
            <div className={styles.modalStatus}>
              <b>{friendlyStatus(selectedConnection.status)}</b>
              <span>{selectedConnection.lastAction}</span>
            </div>
            {connectionError ? (
              <div className={styles.error}>{connectionError}</div>
            ) : null}
            <div className={styles.environmentList}>
              <b>Private environment configuration</b>
              {selectedConnection.requiredEnvironmentVariables.length === 0 ? (
                <span>
                  No environment variables are defined for this planned
                  provider.
                </span>
              ) : (
                selectedConnection.requiredEnvironmentVariables.map((key) => (
                  <code
                    className={
                      selectedConnection.missingEnvironmentVariables.includes(
                        key,
                      )
                        ? styles.missingKey
                        : ""
                    }
                    key={key}
                  >
                    {key}=
                  </code>
                ))
              )}
            </div>
            <div className={styles.securityNotice}>
              <b>Security rule</b>
              <p>
                Never paste passwords, secret keys, access tokens, refresh
                tokens, or application passwords into the browser, employee
                chat, PDF reports, or Git.
              </p>
            </div>
            <div className={styles.modalActions}>
              <button
                type="button"
                onClick={() => void refreshConnectionStatuses()}
                disabled={loadingConnections}
              >
                {loadingConnections ? "Refreshing…" : "Refresh status"}
              </button>
              {selectedConnection.callbackPath ? (
                <button
                  type="button"
                  onClick={() => void openOAuth(selectedConnection)}
                  disabled={connectionBusyProvider === selectedConnection.providerId}
                >
                  {connectionBusyProvider === selectedConnection.providerId
                    ? "Checking…"
                    : "Start secure authorization"}
                </button>
              ) : null}
              <button type="button" onClick={() => setSelectedConnection(null)}>
                Close
              </button>
            </div>
          </section>
        </div>
      ) : null}
    </div>
  );
}
