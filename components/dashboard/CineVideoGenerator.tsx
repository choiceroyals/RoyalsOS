"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";

import {
  CINE_ASPECT_RATIOS,
  CINE_BUDGET_MODES,
  CINE_VIDEO_TYPES,
  type CineBudgetMode,
  type CineVideoType,
} from "@/lib/cine/config";
import {
  addBrandPublishingJob,
  loadBrandOperationsState,
  saveBrandOperationsState,
  updateBrandPublishingJob,
} from "@/lib/brands/client";
import {
  CORE_OPERATIONS_EVENT,
  createCoreApproval,
  getCoreApproval,
  loadCoreOperationsState,
  resolveCoreWorkspaceId,
} from "@/lib/core-operations/storage";
import type { ApprovalStatus } from "@/lib/core-operations/types";

import styles from "./CineVideoGenerator.module.css";

type ProviderStatus = {
  id: string;
  name: string;
  purpose: string;
  configured: boolean;
};

type CineScene = {
  number: number;
  durationSeconds: number;
  purpose: string;
  visualDirection: string;
  narration: string;
  onScreenText: string;
  recommendedProvider: string;
};

type CinePlan = {
  title: string;
  creativeDirection: string;
  providerStrategy: string[];
  productionSteps: string[];
  scenes: CineScene[];
  deliverables: string[];
  approvalNotes: string[];
};

type GenerationStatus =
  | "not_started"
  | "PENDING"
  | "RUNNING"
  | "SUCCEEDED"
  | "FAILED"
  | "CANCELED";

type CineLibraryItem = {
  id: string;
  prompt: string;
  workspace: string;
  videoType: CineVideoType;
  aspectRatio: "9:16" | "16:9" | "1:1";
  durationSeconds: number;
  budgetMode: CineBudgetMode;
  plan: CinePlan;
  createdAt: string;
  status: "planned" | "awaiting_approval" | "rendering" | "ready" | "published" | "failed";
  approvalId?: string;
  approvalStatus?: ApprovalStatus;
  publishingJobId?: string;
  generationTaskId?: string;
  generationProvider?: string;
  generatedDurationSeconds?: number;
  generationStatus?: GenerationStatus;
  outputUrl?: string;
  generationError?: string;
};

const CINE_LIBRARY_STORAGE_KEY = "royalos:cine-video-library:v1";
const BRAND_VIEW_REQUEST_KEY = "royalos:brand-operations:requested-view";

type CineApiResponse = {
  plan?: CinePlan;
  providers?: ProviderStatus[];
  planningMode?: string;
  model?: string;
  error?: string;
};

type GenerateResponse = {
  taskId?: string;
  provider?: string;
  generatedDurationSeconds?: number;
  status?: GenerationStatus;
  message?: string;
  error?: string;
};

type StatusResponse = {
  taskId?: string;
  status?: GenerationStatus;
  progress?: number;
  localUrl?: string;
  output?: string[];
  error?: string;
};

const WORKSPACES = [
  "Triple-Hay Concept LLC",
  "ChoiceRoyals",
  "Xena Grace",
  "TD Talk",
];

type CineVideoStudioProps = {
  onOpenConnections?: () => void;
  onOpenApprovals?: () => void;
};

function readLibrary(): CineLibraryItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(CINE_LIBRARY_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as CineLibraryItem[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function brandIdForWorkspace(workspace: string): string {
  const state = loadBrandOperationsState();
  return (
    state.brands.find(
      (brand) =>
        brand.name.toLowerCase() === workspace.toLowerCase() ||
        brand.legalName?.toLowerCase() === workspace.toLowerCase(),
    )?.id ?? state.selectedBrandId
  );
}

function platformIdsForAspectRatio(aspectRatio: "9:16" | "16:9" | "1:1") {
  if (aspectRatio === "9:16") return ["instagram", "tiktok", "youtube", "facebook"];
  if (aspectRatio === "1:1") return ["instagram", "facebook", "linkedin"];
  return ["youtube", "facebook", "linkedin"];
}

export default function CineVideoStudio({
  onOpenConnections,
  onOpenApprovals,
}: CineVideoStudioProps) {
  const [prompt, setPrompt] = useState("");
  const [workspace, setWorkspace] = useState("ChoiceRoyals");
  const [videoType, setVideoType] = useState<CineVideoType>("Social media video");
  const [aspectRatio, setAspectRatio] = useState<"9:16" | "16:9" | "1:1">("9:16");
  const [durationSeconds, setDurationSeconds] = useState(30);
  const [budgetMode, setBudgetMode] = useState<CineBudgetMode>("Balanced");
  const [presenterRequired, setPresenterRequired] = useState(false);
  const [voiceoverRequired, setVoiceoverRequired] = useState(true);
  const [captionsRequired, setCaptionsRequired] = useState(true);
  const [brandLogoRequired, setBrandLogoRequired] = useState(true);
  const [providers, setProviders] = useState<ProviderStatus[]>([]);
  const [plan, setPlan] = useState<CinePlan | null>(null);
  const [planningMode, setPlanningMode] = useState("");
  const [loading, setLoading] = useState(false);
  const [generationBusy, setGenerationBusy] = useState(false);
  const [error, setError] = useState("");
  const [handoffMessage, setHandoffMessage] = useState("");
  const [libraryOpen, setLibraryOpen] = useState(false);
  const [videoLibrary, setVideoLibrary] = useState<CineLibraryItem[]>([]);
  const [currentProjectId, setCurrentProjectId] = useState("");

  const currentProject = useMemo(
    () => videoLibrary.find((item) => item.id === currentProjectId),
    [currentProjectId, videoLibrary],
  );

  const currentApproval = currentProject?.approvalId
    ? getCoreApproval(currentProject.approvalId)
    : undefined;
  const approvalStatus = currentApproval?.status ?? currentProject?.approvalStatus;
  const runwayReady = providers.some(
    (provider) => provider.id === "runway" && provider.configured,
  );

  useEffect(() => {
    void fetch("/api/cine", { cache: "no-store" })
      .then(async (response) => {
        const data = (await response.json()) as CineApiResponse;
        if (Array.isArray(data.providers)) setProviders(data.providers);
      })
      .catch(() => setProviders([]));
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => setVideoLibrary(readLibrary()), 0);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    const syncApprovals = () => {
      const operations = loadCoreOperationsState();
      setVideoLibrary((current) => {
        let changed = false;
        const next = current.map((item) => {
          if (!item.approvalId) return item;
          const approval = operations.approvals.find((record) => record.id === item.approvalId);
          if (!approval || approval.status === item.approvalStatus) return item;
          changed = true;
          const nextStatus: CineLibraryItem["status"] =
            approval.status === "Approved"
              ? item.status === "awaiting_approval"
                ? "planned"
                : item.status
              : approval.status === "Rejected"
                ? "failed"
                : "awaiting_approval";
          return {
            ...item,
            approvalStatus: approval.status,
            status: nextStatus,
          };
        });
        if (changed) {
          window.localStorage.setItem(CINE_LIBRARY_STORAGE_KEY, JSON.stringify(next));
          return next;
        }
        return current;
      });
    };
    window.addEventListener(CORE_OPERATIONS_EVENT, syncApprovals);
    return () => window.removeEventListener(CORE_OPERATIONS_EVENT, syncApprovals);
  }, []);

  useEffect(() => {
    const project = currentProject;
    if (
      !project?.generationTaskId ||
      !["PENDING", "RUNNING"].includes(project.generationStatus ?? "")
    ) {
      return;
    }

    let cancelled = false;
    let timer = 0;
    const poll = async () => {
      try {
        const query = new URLSearchParams({
          id: project.generationTaskId!,
          workspace: project.workspace,
          projectId: project.id,
        });
        const response = await fetch(`/api/cine/status?${query.toString()}`, {
          cache: "no-store",
        });
        const data = (await response.json()) as StatusResponse;
        if (!response.ok) throw new Error(data.error || "Cine could not check the video job.");
        if (cancelled) return;

        updateLibraryProject(project.id, {
          generationStatus: data.status ?? project.generationStatus,
          status:
            data.status === "SUCCEEDED"
              ? "ready"
              : data.status === "FAILED" || data.status === "CANCELED"
                ? "failed"
                : "rendering",
          outputUrl: data.localUrl ?? data.output?.[0] ?? project.outputUrl,
          generationError: data.error,
        });

        if (data.status === "SUCCEEDED") {
          setHandoffMessage(
            "Cine finished the approved provider video and saved it into the local RoyalOS media library.",
          );
          if (project.publishingJobId && (data.localUrl || data.output?.[0])) {
            const brandState = loadBrandOperationsState();
            saveBrandOperationsState(
              updateBrandPublishingJob(brandState, project.publishingJobId, {
                assetUrl: data.localUrl ?? data.output?.[0],
                mediaStatus: "media_ready",
              }),
            );
          }
          return;
        }
        if (data.status === "FAILED" || data.status === "CANCELED") return;
        timer = window.setTimeout(poll, 6500);
      } catch (caughtError) {
        if (cancelled) return;
        updateLibraryProject(project.id, {
          generationStatus: "FAILED",
          status: "failed",
          generationError:
            caughtError instanceof Error ? caughtError.message : "Video generation failed.",
        });
      }
    };

    timer = window.setTimeout(poll, 2500);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [currentProject?.generationTaskId, currentProject?.generationStatus]);

  function persistVideoLibrary(items: CineLibraryItem[]) {
    setVideoLibrary(items);
    window.localStorage.setItem(CINE_LIBRARY_STORAGE_KEY, JSON.stringify(items));
  }

  function updateLibraryProject(id: string, patch: Partial<CineLibraryItem>) {
    setVideoLibrary((current) => {
      const next = current.map((item) => (item.id === id ? { ...item, ...patch } : item));
      window.localStorage.setItem(CINE_LIBRARY_STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  }

  async function prepareProject(event: FormEvent) {
    event.preventDefault();
    if (!prompt.trim() || loading) return;

    setLoading(true);
    setError("");
    setPlan(null);
    setHandoffMessage("");

    try {
      const response = await fetch("/api/cine", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt,
          workspace,
          videoType,
          aspectRatio,
          durationSeconds,
          budgetMode,
          presenterRequired,
          voiceoverRequired,
          captionsRequired,
          brandLogoRequired,
        }),
      });

      const data = (await response.json()) as CineApiResponse;
      if (!response.ok || !data.plan) {
        throw new Error(data.error || "Cine could not prepare the video project.");
      }

      setPlan(data.plan);
      setPlanningMode(data.planningMode || "planning");
      if (Array.isArray(data.providers)) setProviders(data.providers);

      const libraryItem: CineLibraryItem = {
        id: `cine_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        prompt: prompt.trim(),
        workspace,
        videoType,
        aspectRatio,
        durationSeconds,
        budgetMode,
        plan: data.plan,
        createdAt: new Date().toISOString(),
        status: "planned",
        generationStatus: "not_started",
      };
      setCurrentProjectId(libraryItem.id);
      persistVideoLibrary([libraryItem, ...readLibrary()].slice(0, 100));
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Cine could not prepare the video project.",
      );
    } finally {
      setLoading(false);
    }
  }

  function requestApproval() {
    if (!plan || !currentProject) return;
    const approval = createCoreApproval({
      title: `Approve Cine production: ${plan.title}`,
      kind: "AI video generation",
      workspaceId: resolveCoreWorkspaceId(workspace),
      requestedBy: "Cine",
      targetEmployee: "Cine",
      sourceType: "cine_project",
      sourceId: currentProject.id,
      summary: `${plan.creativeDirection} Requested output: ${durationSeconds}s ${aspectRatio}, ${budgetMode} budget. Approval authorizes Cine to spend connected provider credits.`,
      metadata: {
        videoType,
        aspectRatio,
        durationSeconds,
        budgetMode,
      },
    });
    updateLibraryProject(currentProject.id, {
      approvalId: approval.id,
      approvalStatus: approval.status,
      status: "awaiting_approval",
    });
    setHandoffMessage(
      "Approval request created. Open CEO Approval Center to approve, request changes, or reject it.",
    );
  }

  function sendPlanToEmmy() {
    if (!plan || !currentProject) return;
    const brandState = loadBrandOperationsState();
    const brandId = brandIdForWorkspace(workspace);
    const existing = currentProject.publishingJobId
      ? brandState.publishingJobs.find((job) => job.id === currentProject.publishingJobId)
      : brandState.publishingJobs.find((job) => job.sourceProjectId === currentProject.id);

    if (existing) {
      saveBrandOperationsState(
        updateBrandPublishingJob(brandState, existing.id, {
          caption: plan.creativeDirection,
          assetUrl: currentProject.outputUrl,
          mediaStatus: currentProject.outputUrl ? "media_ready" : "awaiting_media",
        }),
      );
      updateLibraryProject(currentProject.id, { publishingJobId: existing.id });
    } else {
      const next = addBrandPublishingJob(brandState, {
        brandId,
        title: plan.title,
        platformIds: platformIdsForAspectRatio(aspectRatio),
        contentType: videoType,
        caption: plan.creativeDirection,
        createdBy: "Cine",
        approvalStatus: "draft",
        publishStatus: "not_ready",
        sourceProjectId: currentProject.id,
        assetUrl: currentProject.outputUrl,
        mediaStatus: currentProject.outputUrl ? "media_ready" : "awaiting_media",
      });
      const created = next.publishingJobs.find((job) => job.sourceProjectId === currentProject.id);
      saveBrandOperationsState(next);
      if (created) updateLibraryProject(currentProject.id, { publishingJobId: created.id });
    }

    setHandoffMessage(
      currentProject.outputUrl
        ? "Final media and production brief were sent to Emmy's brand publishing queue."
        : "Production plan was received by Emmy and is visible in the brand Publishing tab. It remains marked awaiting media until Cine finishes generation.",
    );
  }

  async function generateApprovedVideo() {
    if (!plan || !currentProject || generationBusy) return;
    if (approvalStatus !== "Approved") {
      setError("Approve this production in CEO Approval Center before generating media.");
      return;
    }

    setGenerationBusy(true);
    setError("");
    setHandoffMessage("");
    try {
      const response = await fetch("/api/cine/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          approvalStatus,
          projectId: currentProject.id,
          title: plan.title,
          prompt: currentProject.prompt,
          workspace,
          aspectRatio,
          durationSeconds,
          voiceoverRequired,
          scenes: plan.scenes,
        }),
      });
      const data = (await response.json()) as GenerateResponse;
      if (!response.ok || !data.taskId) {
        throw new Error(data.error || "Cine could not start provider generation.");
      }
      updateLibraryProject(currentProject.id, {
        generationTaskId: data.taskId,
        generationProvider: data.provider,
        generatedDurationSeconds: data.generatedDurationSeconds,
        generationStatus: data.status ?? "PENDING",
        status: "rendering",
        generationError: undefined,
      });
      setHandoffMessage(data.message || "Cine started the approved video generation.");
    } catch (caughtError) {
      setError(
        caughtError instanceof Error ? caughtError.message : "Cine could not start video generation.",
      );
    } finally {
      setGenerationBusy(false);
    }
  }

  function openPublishingQueue() {
    window.sessionStorage.setItem(BRAND_VIEW_REQUEST_KEY, "publishing");
    onOpenConnections?.();
  }

  const readyProviders = providers.filter((provider) => provider.configured).length;

  return (
    <div className={styles.studio}>
      <section className={styles.hero}>
        <div className={styles.heroTitle}>
          <div className={styles.avatar}>CI</div>
          <div>
            <h1>Cine Video Studio</h1>
            <p>
              Plan, approve, generate, preserve, and hand off video work without losing the
              project trail between Cine, the CEO Approval Center, and Emmy.
            </p>
          </div>
        </div>
        <div className={styles.heroActions}>
          <span className={styles.status}>● Ready to plan and route</span>
          <button
            type="button"
            className={styles.secondaryButton}
            onClick={() => setLibraryOpen((value) => !value)}
          >
            {libraryOpen ? "Close Video Library" : `Video Library (${videoLibrary.length})`}
          </button>
        </div>
      </section>

      {libraryOpen ? (
        <section className={`${styles.card} ${styles.library}`}>
          <div className={styles.cardHeader}>
            <h2>Video Library</h2>
            <p>Saved production plans, approvals, provider jobs, and generated media.</p>
          </div>
          {videoLibrary.length === 0 ? (
            <div className={styles.notice}>No video projects are saved yet.</div>
          ) : (
            <div className={styles.libraryGrid}>
              {videoLibrary.map((item) => (
                <article key={item.id} className={styles.libraryCard}>
                  <div>
                    <strong>{item.plan.title}</strong>
                    <span>{item.workspace} · {item.videoType}</span>
                  </div>
                  <p>{item.prompt}</p>
                  <div className={styles.projectBadges}>
                    <span>Approval: {item.approvalStatus ?? "Not requested"}</span>
                    <span>Generation: {item.generationStatus ?? "not started"}</span>
                    <span>Emmy: {item.publishingJobId ? "Received" : "Not sent"}</span>
                  </div>
                  {item.outputUrl ? (
                    <video className={styles.videoPreview} controls preload="metadata" src={item.outputUrl} />
                  ) : null}
                  {item.generationError ? <div className={styles.error}>{item.generationError}</div> : null}
                  <small>
                    {item.aspectRatio} · requested {item.durationSeconds}s
                    {item.generatedDurationSeconds ? ` · generated ${item.generatedDurationSeconds}s` : ""}
                    {` · ${new Date(item.createdAt).toLocaleString()}`}
                  </small>
                  <div className={styles.libraryActions}>
                    <button
                      type="button"
                      className={styles.secondaryButton}
                      onClick={() => {
                        setPrompt(item.prompt);
                        setWorkspace(item.workspace);
                        setVideoType(item.videoType);
                        setAspectRatio(item.aspectRatio);
                        setDurationSeconds(item.durationSeconds);
                        setBudgetMode(item.budgetMode);
                        setPlan(item.plan);
                        setCurrentProjectId(item.id);
                        setLibraryOpen(false);
                      }}
                    >
                      Open project
                    </button>
                    <button
                      type="button"
                      className={styles.secondaryButton}
                      onClick={() => persistVideoLibrary(videoLibrary.filter((video) => video.id !== item.id))}
                    >
                      Remove
                    </button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      ) : null}

      <div className={styles.layout}>
        <section className={styles.card}>
          <div className={styles.cardHeader}>
            <h2>Create a video project</h2>
            <p>Describe the result. Cine creates a plan first so provider spending stays controlled.</p>
          </div>

          <form className={styles.form} onSubmit={prepareProject}>
            <label>
              <span>Video instruction</span>
              <textarea
                value={prompt}
                onChange={(event) => setPrompt(event.target.value)}
                placeholder="Create a premium ChoiceRoyals advertisement..."
              />
            </label>

            <div className={styles.gridTwo}>
              <label>
                <span>Workspace</span>
                <select value={workspace} onChange={(event) => setWorkspace(event.target.value)}>
                  {WORKSPACES.map((item) => <option key={item}>{item}</option>)}
                </select>
              </label>
              <label>
                <span>Video type</span>
                <select
                  value={videoType}
                  onChange={(event) => setVideoType(event.target.value as CineVideoType)}
                >
                  {CINE_VIDEO_TYPES.map((item) => <option key={item}>{item}</option>)}
                </select>
              </label>
            </div>

            <div className={styles.gridThree}>
              <label>
                <span>Aspect ratio</span>
                <select
                  value={aspectRatio}
                  onChange={(event) => setAspectRatio(event.target.value as typeof aspectRatio)}
                >
                  {CINE_ASPECT_RATIOS.map((item) => (
                    <option key={item.value} value={item.value}>{item.label}</option>
                  ))}
                </select>
              </label>
              <label>
                <span>Duration in seconds</span>
                <input
                  type="number"
                  min={5}
                  max={180}
                  value={durationSeconds}
                  onChange={(event) => setDurationSeconds(Number(event.target.value))}
                />
              </label>
              <label>
                <span>Budget mode</span>
                <select
                  value={budgetMode}
                  onChange={(event) => setBudgetMode(event.target.value as CineBudgetMode)}
                >
                  {CINE_BUDGET_MODES.map((item) => (
                    <option key={item.value} value={item.value}>{item.value}</option>
                  ))}
                </select>
              </label>
            </div>

            <div className={styles.checks}>
              <label><input type="checkbox" checked={presenterRequired} onChange={(event) => setPresenterRequired(event.target.checked)} /> Presenter or avatar</label>
              <label><input type="checkbox" checked={voiceoverRequired} onChange={(event) => setVoiceoverRequired(event.target.checked)} /> Voice-over/audio</label>
              <label><input type="checkbox" checked={captionsRequired} onChange={(event) => setCaptionsRequired(event.target.checked)} /> Captions</label>
              <label><input type="checkbox" checked={brandLogoRequired} onChange={(event) => setBrandLogoRequired(event.target.checked)} /> Brand logo</label>
            </div>

            {error ? <div className={styles.error}>{error}</div> : null}

            <button className={styles.primaryButton} type="submit" disabled={loading || !prompt.trim()}>
              {loading ? "Cine is preparing the project…" : "Generate production plan"}
            </button>
          </form>
        </section>

        <aside className={styles.card}>
          <div className={styles.cardHeader}>
            <h2>Provider equipment</h2>
            <p>{readyProviders} of {providers.length || 6} provider connections currently ready.</p>
          </div>
          <div className={styles.providerList}>
            {providers.length ? providers.map((provider) => (
              <article className={styles.provider} key={provider.id}>
                <div><strong>{provider.name}</strong><p>{provider.purpose}</p></div>
                <span className={provider.configured ? styles.ready : styles.missing}>
                  {provider.configured ? "Ready" : "Needs key"}
                </span>
              </article>
            )) : <div className={styles.notice}>Cine is checking provider configuration.</div>}
          </div>
          <div className={styles.notice} style={{ marginTop: 12 }}>
            Runway multi-shot generation is connected for the first real provider test. It creates
            one finished 5, 10, or 15-second video. Longer multi-clip assembly remains a later renderer step.
          </div>
          <button
            className={styles.secondaryButton}
            style={{ width: "100%", marginTop: 12 }}
            type="button"
            onClick={onOpenConnections}
            disabled={!onOpenConnections}
          >
            Manage video and social connections
          </button>
        </aside>
      </div>

      {plan ? (
        <section className={`${styles.card} ${styles.plan}`}>
          <div className={styles.planHeading}>
            <div>
              <h2>{plan.title}</h2>
              <p>{plan.creativeDirection}</p>
              <span className={styles.status}>Planning mode: {planningMode}</span>
            </div>
            <div className={styles.workflowStatus}>
              <span>Approval <b>{approvalStatus ?? "Not requested"}</b></span>
              <span>Generation <b>{currentProject?.generationStatus ?? "Not started"}</b></span>
              <span>Emmy <b>{currentProject?.publishingJobId ? "Received" : "Not sent"}</b></span>
            </div>
          </div>

          {currentProject?.outputUrl ? (
            <div className={styles.outputPanel}>
              <h3>Generated video</h3>
              <video className={styles.videoPreviewLarge} controls src={currentProject.outputUrl} />
              <a href={currentProject.outputUrl} target="_blank" rel="noreferrer">Open saved video</a>
            </div>
          ) : null}

          <div className={styles.layout}>
            <div>
              <h3>Provider strategy</h3>
              <ol className={styles.steps}>{plan.providerStrategy.map((item) => <li key={item}>{item}</li>)}</ol>
            </div>
            <div>
              <h3>Production workflow</h3>
              <ol className={styles.steps}>{plan.productionSteps.map((item) => <li key={item}>{item}</li>)}</ol>
            </div>
          </div>

          <div>
            <h3>Storyboard</h3>
            <div className={styles.sceneList}>
              {plan.scenes.map((scene) => (
                <article className={styles.scene} key={scene.number}>
                  <div className={styles.sceneTop}>
                    <strong>Scene {scene.number}: {scene.purpose}</strong>
                    <span>{scene.durationSeconds}s</span>
                  </div>
                  <p><b>Visual:</b> {scene.visualDirection}</p>
                  <p><b>Narration:</b> {scene.narration}</p>
                  <p><b>Text:</b> {scene.onScreenText}</p>
                  <p><b>Provider:</b> {scene.recommendedProvider}</p>
                </article>
              ))}
            </div>
          </div>

          <div className={styles.actionsFour}>
            <button
              className={styles.secondaryButton}
              type="button"
              onClick={requestApproval}
              disabled={!currentProject || approvalStatus === "Pending" || approvalStatus === "Approved"}
            >
              {approvalStatus === "Approved"
                ? "CEO approved"
                : approvalStatus === "Pending"
                  ? "Approval pending"
                  : "Request CEO approval"}
            </button>
            <button
              className={styles.primaryButton}
              type="button"
              onClick={() => void generateApprovedVideo()}
              disabled={
                !currentProject ||
                approvalStatus !== "Approved" ||
                !runwayReady ||
                generationBusy ||
                ["PENDING", "RUNNING"].includes(currentProject.generationStatus ?? "")
              }
              title={!runwayReady ? "Add RUNWAYML_API_SECRET to .env.local." : undefined}
            >
              {generationBusy || ["PENDING", "RUNNING"].includes(currentProject?.generationStatus ?? "")
                ? "Cine is generating…"
                : currentProject?.outputUrl
                  ? "Regenerate approved video"
                  : "Generate approved video"}
            </button>
            <button className={styles.secondaryButton} type="button" onClick={sendPlanToEmmy} disabled={!currentProject}>
              {currentProject?.outputUrl ? "Send final video to Emmy" : "Send production plan to Emmy"}
            </button>
            <button className={styles.secondaryButton} type="button" onClick={openPublishingQueue} disabled={!onOpenConnections}>
              Open Emmy publishing queue
            </button>
          </div>

          <div className={styles.inlineActions}>
            <button className={styles.linkButton} type="button" onClick={onOpenApprovals} disabled={!onOpenApprovals}>
              Open CEO Approval Center
            </button>
            {currentProject?.generationTaskId ? (
              <span>Provider task: {currentProject.generationTaskId}</span>
            ) : null}
          </div>

          {currentProject?.generationError ? <div className={styles.error}>{currentProject.generationError}</div> : null}
          {handoffMessage ? <div className={styles.notice}>{handoffMessage}</div> : null}
        </section>
      ) : null}
    </div>
  );
}
