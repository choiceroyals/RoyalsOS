"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";

import { CORE_OPERATIONS_SEED } from "@/lib/core-operations/seed";
import {
  CORE_OPERATIONS_EVENT,
  loadCoreOperationsState,
  resetCoreOperationsState,
  saveCoreOperationsState,
} from "@/lib/core-operations/storage";
import type {
  ApprovalStatus,
  CoreOperationsSection,
  CoreOperationsState,
  MissionPriority,
  MissionStatus,
} from "@/lib/core-operations/types";
import { ROYALOS_EMPLOYEE_PROFILES } from "@/lib/employees/config";

import ProviderEquipmentSettings from "./ProviderEquipmentSettings";
import styles from "./CoreOperationsCenter.module.css";

type Props = {
  section: CoreOperationsSection;
};

function makeId(prefix: string): string {
  const random =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : Math.random().toString(36).slice(2);
  return `${prefix}-${random}`;
}

function formatDate(value: string): string {
  if (!value) return "No date";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

function statusClass(status: string): string {
  const normalized = status.toLowerCase();
  if (normalized.includes("approved") || normalized.includes("active") || normalized.includes("completed") || normalized.includes("indexed")) {
    return styles.statusGood;
  }
  if (normalized.includes("rejected") || normalized.includes("blocked") || normalized.includes("critical")) {
    return styles.statusDanger;
  }
  if (normalized.includes("pending") || normalized.includes("planning") || normalized.includes("review") || normalized.includes("processing")) {
    return styles.statusWarn;
  }
  return styles.statusNeutral;
}

export default function CoreOperationsCenter({ section }: Props) {
  const [state, setState] = useState<CoreOperationsState>(CORE_OPERATIONS_SEED);
  const stateRef = useRef<CoreOperationsState>(CORE_OPERATIONS_SEED);
  const [ready, setReady] = useState(false);
  const [search, setSearch] = useState("");
  const [notice, setNotice] = useState("");
  const [selectedMessageThreadId, setSelectedMessageThreadId] = useState("");
  const [sourceId] = useState(() => `core-${Math.random().toString(36).slice(2)}`);

  useEffect(() => {
    const refresh = (event?: Event) => {
      const eventSourceId =
        event instanceof CustomEvent ? event.detail?.sourceId : undefined;
      if (eventSourceId && eventSourceId === sourceId) return;
      const next = loadCoreOperationsState();
      if (JSON.stringify(stateRef.current) !== JSON.stringify(next)) {
        stateRef.current = next;
        setState(next);
      }
    };
    const frame = window.requestAnimationFrame(() => {
      refresh();
      setReady(true);
    });
    window.addEventListener(CORE_OPERATIONS_EVENT, refresh);

    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener(CORE_OPERATIONS_EVENT, refresh);
    };
  }, [sourceId]);

  const workspaceById = useMemo(
    () => new Map(state.workspaces.map((workspace) => [workspace.id, workspace])),
    [state.workspaces],
  );

  const workspaceName = (id: string) => workspaceById.get(id)?.name ?? "Unassigned";

  function updateState(
    updater: (current: CoreOperationsState) => CoreOperationsState,
    message?: string,
  ) {
    const next = {
      ...updater(stateRef.current),
      updatedAt: new Date().toISOString(),
    };
    stateRef.current = next;
    setState(next);
    saveCoreOperationsState(next, { sourceId });
    if (message) setNotice(message);
  }

  function sectionHeader(title: string, description: string, badge: string) {
    return (
      <header className={styles.hero}>
        <div className={styles.heroIcon}>◈</div>
        <div>
          <span className={styles.eyebrow}>RoyalOS Core Operations</span>
          <h1>{title}</h1>
          <p>{description}</p>
        </div>
        <div className={styles.heroMeta}>
          <span>{badge}</span>
          <small>{ready ? "Local persistence active" : "Loading company records"}</small>
        </div>
      </header>
    );
  }

  function noticeBanner() {
    if (!notice) return null;
    return (
      <div className={styles.notice} role="status">
        <span>✓</span>
        {notice}
        <button type="button" onClick={() => setNotice("")} aria-label="Dismiss notice">
          ×
        </button>
      </div>
    );
  }

  function renderWorkspaces() {
    function addWorkspace(event: FormEvent<HTMLFormElement>) {
      event.preventDefault();
      const form = new FormData(event.currentTarget);
      const name = String(form.get("name") ?? "").trim();
      if (!name) return;

      updateState(
        (current) => ({
          ...current,
          workspaces: [
            ...current.workspaces,
            {
              id: makeId("workspace"),
              name,
              type: String(form.get("type") ?? "Business Workspace"),
              description: String(form.get("description") ?? ""),
              status: "Active",
              accent: "#f4b942",
              memberCount: 1,
              missionCount: 0,
              documentCount: 0,
              createdAt: new Date().toISOString(),
            },
          ],
        }),
        `${name} was added to RoyalOS.`,
      );
      event.currentTarget.reset();
    }

    const active = state.workspaces.filter((workspace) => workspace.status === "Active").length;
    const missions = state.missions.length;
    const documents = state.knowledge.length;

    return (
      <>
        {sectionHeader(
          "Company Workspaces",
          "Separate every brand, mission, document, employee assignment, integration, and record by company.",
          `${state.workspaces.length} workspaces`,
        )}
        {noticeBanner()}
        <div className={styles.statsGrid}>
          <Metric label="Active workspaces" value={active} detail="Operating now" />
          <Metric label="Tracked missions" value={missions} detail="Across all companies" />
          <Metric label="Knowledge records" value={documents} detail="Company documents" />
          <Metric label="Employees available" value={ROYALOS_EMPLOYEE_PROFILES.length} detail="Shared workforce" />
        </div>

        <div className={styles.twoColumn}>
          <section className={styles.panel}>
            <div className={styles.panelHeading}>
              <div>
                <h2>Workspace directory</h2>
                <p>Each workspace is a private operating area for one business or brand.</p>
              </div>
            </div>
            <div className={styles.cardList}>
              {state.workspaces.map((workspace) => (
                <article className={styles.workspaceCard} key={workspace.id}>
                  <div className={styles.workspaceAccent} style={{ background: workspace.accent }} />
                  <div className={styles.workspaceBody}>
                    <div className={styles.rowBetween}>
                      <div>
                        <h3>{workspace.name}</h3>
                        <p className={styles.muted}>{workspace.type}</p>
                      </div>
                      <span className={`${styles.status} ${statusClass(workspace.status)}`}>{workspace.status}</span>
                    </div>
                    <p>{workspace.description}</p>
                    <div className={styles.miniMetrics}>
                      <span><strong>{workspace.memberCount}</strong> people</span>
                      <span><strong>{state.missions.filter((mission) => mission.workspaceId === workspace.id).length}</strong> missions</span>
                      <span><strong>{state.knowledge.filter((doc) => doc.workspaceId === workspace.id).length}</strong> records</span>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </section>

          <section className={styles.panel}>
            <div className={styles.panelHeading}>
              <div>
                <h2>Create workspace</h2>
                <p>Add a new business, department, client, or future RoyalOS customer.</p>
              </div>
            </div>
            <form className={styles.formStack} onSubmit={addWorkspace}>
              <label>
                Workspace name
                <input name="name" placeholder="Example: ChoiceRoyals Academy" required />
              </label>
              <label>
                Workspace type
                <select name="type" defaultValue="Business Workspace">
                  <option>Business Workspace</option>
                  <option>Brand</option>
                  <option>Department</option>
                  <option>Client Organization</option>
                  <option>Project Workspace</option>
                </select>
              </label>
              <label>
                Description
                <textarea name="description" rows={5} placeholder="What belongs in this workspace?" />
              </label>
              <button className={styles.primaryButton} type="submit">Create workspace</button>
            </form>
          </section>
        </div>
      </>
    );
  }

  function renderMissions() {
    const filtered = state.missions.filter((mission) => {
      const haystack = `${mission.title} ${mission.description} ${mission.leadEmployee} ${workspaceName(mission.workspaceId)}`.toLowerCase();
      return haystack.includes(search.toLowerCase());
    });

    function addMission(event: FormEvent<HTMLFormElement>) {
      event.preventDefault();
      const form = new FormData(event.currentTarget);
      const title = String(form.get("title") ?? "").trim();
      if (!title) return;
      const lead = String(form.get("leadEmployee") ?? "Adedeji");
      const now = new Date().toISOString();
      updateState(
        (current) => ({
          ...current,
          missions: [
            {
              id: makeId("mission"),
              title,
              workspaceId: String(form.get("workspaceId") ?? current.settings.defaultWorkspaceId),
              description: String(form.get("description") ?? ""),
              leadEmployee: lead,
              supportingEmployees: [],
              priority: String(form.get("priority") ?? "Normal") as MissionPriority,
              status: "Planning",
              progress: 0,
              dueDate: String(form.get("dueDate") ?? ""),
              createdAt: now,
              updatedAt: now,
            },
            ...current.missions,
          ],
        }),
        `Mission “${title}” was created and assigned to ${lead}.`,
      );
      event.currentTarget.reset();
    }

    function advanceMission(id: string) {
      updateState((current) => ({
        ...current,
        missions: current.missions.map((mission) => {
          if (mission.id !== id) return mission;
          const progress = Math.min(100, mission.progress + 10);
          const status: MissionStatus = progress === 100 ? "Completed" : mission.status === "Planning" ? "In Progress" : mission.status;
          return { ...mission, progress, status, updatedAt: new Date().toISOString() };
        }),
      }), "Mission progress was updated.");
    }

    return (
      <>
        {sectionHeader(
          "Mission System",
          "Turn every assignment into a trackable mission with owners, deadlines, files, approvals, progress, and employee reports.",
          `${state.missions.length} missions`,
        )}
        {noticeBanner()}
        <div className={styles.toolbar}>
          <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search missions, employees, or workspaces..." />
          <span>{filtered.length} shown</span>
        </div>
        <div className={styles.twoColumnWide}>
          <section className={styles.panel}>
            <div className={styles.cardList}>
              {filtered.map((mission) => (
                <article className={styles.missionCard} key={mission.id}>
                  <div className={styles.rowBetween}>
                    <div>
                      <span className={styles.kicker}>{workspaceName(mission.workspaceId)}</span>
                      <h3>{mission.title}</h3>
                    </div>
                    <span className={`${styles.status} ${statusClass(mission.status)}`}>{mission.status}</span>
                  </div>
                  <p>{mission.description}</p>
                  <div className={styles.assignmentLine}>
                    <span>Lead: <strong>{mission.leadEmployee}</strong></span>
                    <span>Priority: <strong>{mission.priority}</strong></span>
                    <span>Due: <strong>{formatDate(mission.dueDate)}</strong></span>
                  </div>
                  <div className={styles.progressTrack} aria-label={`${mission.progress}% complete`}>
                    <span style={{ width: `${mission.progress}%` }} />
                  </div>
                  <div className={styles.rowBetween}>
                    <small>{mission.progress}% complete</small>
                    <button type="button" className={styles.smallButton} onClick={() => advanceMission(mission.id)} disabled={mission.progress >= 100}>
                      {mission.progress >= 100 ? "Completed" : "Add progress"}
                    </button>
                  </div>
                </article>
              ))}
            </div>
          </section>

          <section className={styles.panel}>
            <div className={styles.panelHeading}><div><h2>Create mission</h2><p>Assign a clear business outcome to an employee.</p></div></div>
            <form className={styles.formStack} onSubmit={addMission}>
              <label>Mission title<input name="title" required placeholder="Launch a new Xena Grace song" /></label>
              <label>Workspace<select name="workspaceId" defaultValue={state.settings.defaultWorkspaceId}>{state.workspaces.map((workspace) => <option value={workspace.id} key={workspace.id}>{workspace.name}</option>)}</select></label>
              <label>Lead employee<select name="leadEmployee" defaultValue="Adedeji">{ROYALOS_EMPLOYEE_PROFILES.map((employee) => <option key={employee.name}>{employee.name}</option>)}</select></label>
              <div className={styles.formGrid}>
                <label>Priority<select name="priority" defaultValue="Normal"><option>Low</option><option>Normal</option><option>High</option><option>Critical</option></select></label>
                <label>Due date<input type="date" name="dueDate" /></label>
              </div>
              <label>Description<textarea name="description" rows={5} placeholder="Define the outcome, deliverables, and approval conditions." /></label>
              <button className={styles.primaryButton} type="submit">Create mission</button>
            </form>
          </section>
        </div>
      </>
    );
  }

  function renderApprovals() {
    const pending = state.approvals.filter((approval) => approval.status === "Pending");

    function setApprovalStatus(id: string, status: ApprovalStatus) {
      updateState((current) => ({
        ...current,
        approvals: current.approvals.map((approval) => approval.id === id ? { ...approval, status, updatedAt: new Date().toISOString() } : approval),
      }), `Approval status changed to ${status}.`);
    }

    return (
      <>
        {sectionHeader(
          "CEO Approval Center",
          "Review sensitive employee actions before social publishing, accounting changes, customer communication, deletion, payment, or deployment.",
          `${pending.length} pending`,
        )}
        {noticeBanner()}
        <div className={styles.statsGrid}>
          <Metric label="Pending" value={pending.length} detail="Awaiting your decision" />
          <Metric label="Approved" value={state.approvals.filter((item) => item.status === "Approved").length} detail="Cleared for execution" />
          <Metric label="Changes requested" value={state.approvals.filter((item) => item.status === "Changes Requested").length} detail="Returned to employees" />
          <Metric label="Rejected" value={state.approvals.filter((item) => item.status === "Rejected").length} detail="Stopped by CEO" />
        </div>
        <section className={styles.panel}>
          <div className={styles.cardList}>
            {state.approvals.map((approval) => (
              <article className={styles.approvalCard} key={approval.id}>
                <div className={styles.rowBetween}>
                  <div>
                    <span className={styles.kicker}>{approval.kind} · {workspaceName(approval.workspaceId)}</span>
                    <h3>{approval.title}</h3>
                  </div>
                  <span className={`${styles.status} ${statusClass(approval.status)}`}>{approval.status}</span>
                </div>
                <p>{approval.summary}</p>
                <div className={styles.assignmentLine}>
                  <span>Requested by <strong>{approval.requestedBy}</strong></span>
                  <span>{formatDate(approval.createdAt)}</span>
                </div>
                {approval.status === "Pending" && (
                  <div className={styles.actionRow}>
                    <button className={styles.approveButton} type="button" onClick={() => setApprovalStatus(approval.id, "Approved")}>Approve</button>
                    <button className={styles.secondaryButton} type="button" onClick={() => setApprovalStatus(approval.id, "Changes Requested")}>Request changes</button>
                    <button className={styles.rejectButton} type="button" onClick={() => setApprovalStatus(approval.id, "Rejected")}>Reject</button>
                  </div>
                )}
              </article>
            ))}
          </div>
        </section>
      </>
    );
  }

  function renderKnowledge() {
    const filtered = state.knowledge.filter((document) => `${document.title} ${document.category} ${document.source} ${document.notes}`.toLowerCase().includes(search.toLowerCase()));

    function addDocument(event: FormEvent<HTMLFormElement>) {
      event.preventDefault();
      const form = new FormData(event.currentTarget);
      const title = String(form.get("title") ?? "").trim();
      if (!title) return;
      const file = form.get("file");
      const source = file instanceof File && file.name ? file.name : String(form.get("source") ?? "Manual record");
      updateState((current) => ({
        ...current,
        knowledge: [
          {
            id: makeId("knowledge"),
            title,
            workspaceId: String(form.get("workspaceId") ?? current.settings.defaultWorkspaceId),
            category: String(form.get("category") ?? "Company knowledge"),
            source,
            status: "Indexed",
            access: ["Adedeji"],
            notes: String(form.get("notes") ?? ""),
            updatedAt: new Date().toISOString(),
          },
          ...current.knowledge,
        ],
      }), `“${title}” was added to the knowledge index.`);
      event.currentTarget.reset();
    }

    return (
      <>
        {sectionHeader(
          "Company Knowledge",
          "Store official documents, policies, playbooks, catalogs, research, and source material employees can search and cite.",
          `${state.knowledge.length} indexed records`,
        )}
        {noticeBanner()}
        <div className={styles.toolbar}><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search company knowledge..." /><span>{filtered.length} results</span></div>
        <div className={styles.twoColumnWide}>
          <section className={styles.panel}>
            <div className={styles.tableWrap}>
              <table>
                <thead><tr><th>Document</th><th>Workspace</th><th>Category</th><th>Status</th><th>Access</th></tr></thead>
                <tbody>{filtered.map((document) => <tr key={document.id}><td><strong>{document.title}</strong><small>{document.source}</small></td><td>{workspaceName(document.workspaceId)}</td><td>{document.category}</td><td><span className={`${styles.status} ${statusClass(document.status)}`}>{document.status}</span></td><td>{document.access.join(", ")}</td></tr>)}</tbody>
              </table>
            </div>
          </section>
          <section className={styles.panel}>
            <div className={styles.panelHeading}><div><h2>Add knowledge</h2><p>Register a file or company decision in the searchable index.</p></div></div>
            <form className={styles.formStack} onSubmit={addDocument}>
              <label>Document title<input name="title" required placeholder="Customer support policy" /></label>
              <label>Workspace<select name="workspaceId" defaultValue={state.settings.defaultWorkspaceId}>{state.workspaces.map((workspace) => <option value={workspace.id} key={workspace.id}>{workspace.name}</option>)}</select></label>
              <label>Category<select name="category" defaultValue="Company knowledge"><option>Company knowledge</option><option>Strategy</option><option>Finance policy</option><option>Marketing</option><option>Creative catalog</option><option>Customer support</option><option>Technical architecture</option></select></label>
              <label>Choose file<input name="file" type="file" /></label>
              <label>Notes<textarea name="notes" rows={4} placeholder="Explain how employees should use this information." /></label>
              <button className={styles.primaryButton} type="submit">Add to knowledge</button>
            </form>
          </section>
        </div>
      </>
    );
  }

  function renderMemory() {
    function addMemory(event: FormEvent<HTMLFormElement>) {
      event.preventDefault();
      const form = new FormData(event.currentTarget);
      const title = String(form.get("title") ?? "").trim();
      const content = String(form.get("content") ?? "").trim();
      if (!title || !content) return;
      updateState((current) => ({
        ...current,
        memories: [
          {
            id: makeId("memory"),
            title,
            workspaceId: String(form.get("workspaceId") ?? current.settings.defaultWorkspaceId),
            kind: String(form.get("kind") ?? "Company decision"),
            source: String(form.get("source") ?? "CEO entry"),
            content,
            pinned: false,
            createdAt: new Date().toISOString(),
          },
          ...current.memories,
        ],
      }), "The memory was saved with its source and workspace.");
      event.currentTarget.reset();
    }

    function togglePinned(id: string) {
      updateState((current) => ({ ...current, memories: current.memories.map((memory) => memory.id === id ? { ...memory, pinned: !memory.pinned } : memory) }));
    }

    function removeMemory(id: string) {
      updateState((current) => ({ ...current, memories: current.memories.filter((memory) => memory.id !== id) }), "The memory was removed.");
    }

    const ordered = [...state.memories].sort((a, b) => Number(b.pinned) - Number(a.pinned));

    return (
      <>
        {sectionHeader(
          "RoyalOS Memory",
          "Preserve CEO preferences, company decisions, milestones, conversation lessons, and employee context with a visible source and date.",
          `${state.memories.length} memories`,
        )}
        {noticeBanner()}
        <div className={styles.twoColumnWide}>
          <section className={styles.panel}>
            <div className={styles.cardList}>
              {ordered.map((memory) => (
                <article className={styles.memoryCard} key={memory.id}>
                  <div className={styles.rowBetween}>
                    <div><span className={styles.kicker}>{memory.kind} · {workspaceName(memory.workspaceId)}</span><h3>{memory.pinned ? "📌 " : ""}{memory.title}</h3></div>
                    <span className={styles.muted}>{formatDate(memory.createdAt)}</span>
                  </div>
                  <p>{memory.content}</p>
                  <div className={styles.rowBetween}>
                    <small>Source: {memory.source}</small>
                    <div className={styles.actionRow}>
                      <button type="button" className={styles.smallButton} onClick={() => togglePinned(memory.id)}>{memory.pinned ? "Unpin" : "Pin"}</button>
                      <button type="button" className={styles.textDanger} onClick={() => removeMemory(memory.id)}>Delete</button>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </section>
          <section className={styles.panel}>
            <div className={styles.panelHeading}><div><h2>Add memory</h2><p>Record something RoyalOS should remember about how the company operates.</p></div></div>
            <form className={styles.formStack} onSubmit={addMemory}>
              <label>Memory title<input name="title" required /></label>
              <label>Workspace<select name="workspaceId" defaultValue={state.settings.defaultWorkspaceId}>{state.workspaces.map((workspace) => <option key={workspace.id} value={workspace.id}>{workspace.name}</option>)}</select></label>
              <label>Memory type<select name="kind"><option>Company decision</option><option>CEO preference</option><option>Product requirement</option><option>Milestone</option><option>Employee lesson</option><option>Customer insight</option></select></label>
              <label>Source<input name="source" placeholder="CEO conversation, mission report, meeting..." /></label>
              <label>Memory<textarea name="content" rows={6} required /></label>
              <button className={styles.primaryButton} type="submit">Save memory</button>
            </form>
          </section>
        </div>
      </>
    );
  }

  function renderMessages() {
    const threadIdFor = (message: CoreOperationsState["messages"][number]) =>
      message.threadId ?? message.id;

    const threadMap = new Map<string, CoreOperationsState["messages"]>();
    for (const message of state.messages) {
      const id = threadIdFor(message);
      const thread = threadMap.get(id) ?? [];
      thread.push(message);
      threadMap.set(id, thread);
    }
    const threads = Array.from(threadMap.entries())
      .map(([id, messages]) => ({
        id,
        messages: [...messages].sort((a, b) => a.createdAt.localeCompare(b.createdAt)),
        latest: [...messages].sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0],
      }))
      .sort((a, b) => b.latest.createdAt.localeCompare(a.latest.createdAt));

    const activeThreadId = selectedMessageThreadId || threads[0]?.id || "";
    const activeThread = threads.find((thread) => thread.id === activeThreadId);

    function markThreadRead(threadId: string) {
      updateState((current) => ({
        ...current,
        messages: current.messages.map((message) =>
          threadIdFor(message) === threadId ? { ...message, read: true } : message,
        ),
      }));
    }

    function addMessage(event: FormEvent<HTMLFormElement>) {
      event.preventDefault();
      const form = new FormData(event.currentTarget);
      const subject = String(form.get("subject") ?? "").trim();
      const body = String(form.get("body") ?? "").trim();
      const to = String(form.get("to") ?? "Adedeji");
      const workspaceId = String(form.get("workspaceId") ?? state.settings.defaultWorkspaceId);
      const actionRequired = form.get("actionRequired") === "on";
      if (!subject || !body) return;
      const now = new Date().toISOString();
      const threadId = makeId("thread");
      const userMessageId = makeId("message");
      const missionId = actionRequired ? makeId("mission") : undefined;
      const acknowledgment = actionRequired
        ? `Received, Ayobami. I understand the request and will begin working on it. I will send progress updates and return the output with a completion report.`
        : `Received, Ayobami. Your message has been recorded and I will keep it in this conversation.`;

      updateState((current) => ({
        ...current,
        messages: [
          {
            id: makeId("message"),
            threadId,
            parentId: userMessageId,
            from: to,
            to: "Ayobami",
            subject: `Re: ${subject}`,
            body: acknowledgment,
            workspaceId,
            kind: actionRequired ? "Mission" : "Employee",
            createdAt: new Date(Date.now() + 1).toISOString(),
            read: false,
            status: actionRequired ? "Working" : "Acknowledged",
            actionRequired,
            missionId,
          },
          {
            id: userMessageId,
            threadId,
            from: "Ayobami",
            to,
            subject,
            body,
            workspaceId,
            kind: "Employee",
            createdAt: now,
            read: true,
            status: "Delivered",
            actionRequired,
            missionId,
          },
          ...current.messages,
        ],
        missions: actionRequired && missionId
          ? [
              {
                id: missionId,
                title: subject,
                workspaceId,
                description: body,
                leadEmployee: to,
                supportingEmployees: [],
                priority: "Normal",
                status: "In Progress",
                progress: 10,
                dueDate: "",
                createdAt: now,
                updatedAt: now,
              },
              ...current.missions,
            ]
          : current.missions,
      }), actionRequired ? `${to} acknowledged the request and it was added to the work queue.` : `${to} acknowledged your message.`);
      setSelectedMessageThreadId(threadId);
      event.currentTarget.reset();
    }

    function replyToThread(event: FormEvent<HTMLFormElement>) {
      event.preventDefault();
      if (!activeThread) return;
      const form = new FormData(event.currentTarget);
      const body = String(form.get("reply") ?? "").trim();
      if (!body) return;
      const first = activeThread.messages[0];
      const otherParty = first.from === "Ayobami" ? first.to : first.from;
      updateState((current) => ({
        ...current,
        messages: [
          {
            id: makeId("message"),
            threadId: activeThread.id,
            parentId: activeThread.latest.id,
            from: "Ayobami",
            to: otherParty,
            subject: `Re: ${first.subject.replace(/^Re:\s*/i, "")}`,
            body,
            workspaceId: first.workspaceId,
            kind: "Employee",
            createdAt: new Date().toISOString(),
            read: true,
            status: "Delivered",
            actionRequired: first.actionRequired,
            missionId: first.missionId,
          },
          {
            id: makeId("message"),
            threadId: activeThread.id,
            from: otherParty,
            to: "Ayobami",
            subject: `Re: ${first.subject.replace(/^Re:\s*/i, "")}`,
            body: first.actionRequired
              ? `Update received. I have added your instruction to the active work item and will include it in my next progress or completion report.`
              : `Reply received. Thank you, Ayobami.`,
            workspaceId: first.workspaceId,
            kind: first.actionRequired ? "Mission" : "Employee",
            createdAt: new Date(Date.now() + 1).toISOString(),
            read: false,
            status: first.actionRequired ? "Working" : "Acknowledged",
            actionRequired: first.actionRequired,
            missionId: first.missionId,
          },
          ...current.messages,
        ],
      }), `${otherParty} confirmed receipt of your reply.`);
      event.currentTarget.reset();
    }

    function completeThread(threadId: string) {
      const thread = threads.find((item) => item.id === threadId);
      if (!thread) return;
      const first = thread.messages[0];
      const employee = first.from === "Ayobami" ? first.to : first.from;
      const now = new Date().toISOString();
      updateState((current) => ({
        ...current,
        messages: [
          {
            id: makeId("message"), threadId, from: employee, to: "Ayobami",
            subject: `Completion report: ${first.subject.replace(/^Re:\s*/i, "")}`,
            body: `Completed. The requested work has been processed by ${employee}. Review the related mission and attached company records for the output, decisions, and recommended next actions.`,
            workspaceId: first.workspaceId, kind: "Mission", createdAt: now, read: false,
            status: "Completed", actionRequired: true, missionId: first.missionId,
          },
          ...current.messages.map((message) => threadIdFor(message) === threadId ? { ...message, status: "Completed" as const } : message),
        ],
        missions: current.missions.map((mission) => mission.id === first.missionId ? { ...mission, status: "Completed", progress: 100, updatedAt: now } : mission),
      }), `${employee} submitted a completion report.`);
    }

    function convertThreadToMission(threadId: string) {
      const thread = threads.find((item) => item.id === threadId);
      if (!thread) return;
      const first = thread.messages[0];
      if (first.missionId) { setNotice("This conversation is already connected to a mission."); return; }
      const missionId = makeId("mission");
      const employee = first.from === "Ayobami" ? first.to : first.from;
      const now = new Date().toISOString();
      updateState((current) => ({
        ...current,
        messages: current.messages.map((message) => threadIdFor(message) === threadId ? { ...message, missionId, actionRequired: true, status: "Working" as const } : message),
        missions: [{ id: missionId, title: first.subject.replace(/^Re:\s*/i, ""), workspaceId: first.workspaceId, description: first.body, leadEmployee: employee, supportingEmployees: [], priority: "Normal", status: "In Progress", progress: 10, dueDate: "", createdAt: now, updatedAt: now }, ...current.missions],
      }), "The conversation was converted into an active mission.");
    }

    const unread = state.messages.filter((message) => !message.read).length;

    return (
      <>
        {sectionHeader("RoyalOS Messages", "Clickable employee conversations with receipt confirmations, work acknowledgements, mission conversion, progress, outputs, and completion reports.", `${unread} unread`)}
        {noticeBanner()}
        <div className={styles.messageWorkspace}>
          <section className={styles.messageThreads}>
            <div className={styles.panelHeading}><div><h2>Conversations</h2><p>Open a thread to reply or take action.</p></div></div>
            {threads.map((thread) => <button type="button" key={thread.id} className={`${styles.threadButton} ${activeThreadId === thread.id ? styles.threadButtonActive : ""}`} onClick={() => { setSelectedMessageThreadId(thread.id); markThreadRead(thread.id); }}>
              <span><strong>{thread.messages[0].subject.replace(/^Re:\s*/i, "")}</strong><small>{thread.latest.from} → {thread.latest.to}</small></span>
              <span><small>{thread.messages.length} messages</small>{thread.messages.some((message) => !message.read) ? <i>New</i> : null}</span>
            </button>)}
          </section>

          <section className={styles.panel}>
            {activeThread ? <>
              <div className={styles.rowBetween}><div><span className={styles.kicker}>{workspaceName(activeThread.messages[0].workspaceId)}</span><h2>{activeThread.messages[0].subject.replace(/^Re:\s*/i, "")}</h2></div><span className={`${styles.status} ${statusClass(activeThread.latest.status ?? "Delivered")}`}>{activeThread.latest.status ?? "Delivered"}</span></div>
              <div className={styles.threadMessages}>{activeThread.messages.map((message) => <article className={`${styles.threadMessage} ${message.from === "Ayobami" ? styles.threadMessageCeo : ""}`} key={message.id}><div className={styles.rowBetween}><strong>{message.from}</strong><small>{formatDate(message.createdAt)}</small></div><p>{message.body}</p><small>To {message.to}{message.missionId ? ` · Mission ${message.missionId}` : ""}</small></article>)}</div>
              <div className={styles.actionRow}><button className={styles.secondaryButton} type="button" onClick={() => convertThreadToMission(activeThread.id)}>Convert to mission</button>{activeThread.messages[0].actionRequired && activeThread.latest.status !== "Completed" ? <button className={styles.primaryButton} type="button" onClick={() => completeThread(activeThread.id)}>Submit completion report</button> : null}</div>
              <form className={styles.formStack} onSubmit={replyToThread}><label>Reply<textarea name="reply" rows={4} required placeholder="Reply, clarify the request, or ask for an update…" /></label><button className={styles.primaryButton} type="submit">Send reply</button></form>
            </> : <p className={styles.muted}>Select a conversation.</p>}
          </section>

          <section className={styles.panel}>
            <div className={styles.panelHeading}><div><h2>Send internal message</h2><p>The employee will confirm receipt. Requests enter the work queue.</p></div></div>
            <form className={styles.formStack} onSubmit={addMessage}>
              <label>Employee<select name="to" defaultValue="Adedeji">{ROYALOS_EMPLOYEE_PROFILES.map((employee) => <option key={employee.name}>{employee.name}</option>)}</select></label>
              <label>Workspace<select name="workspaceId" defaultValue={state.settings.defaultWorkspaceId}>{state.workspaces.map((workspace) => <option key={workspace.id} value={workspace.id}>{workspace.name}</option>)}</select></label>
              <label>Subject<input name="subject" required /></label>
              <label>Message<textarea name="body" rows={6} required /></label>
              <label className={styles.checkRow}><input type="checkbox" name="actionRequired" defaultChecked /><span>This message contains a request that requires work and a completion report.</span></label>
              <button className={styles.primaryButton} type="submit">Send to employee</button>
            </form>
          </section>
        </div>
      </>
    );
  }

  function renderAnalytics() {
    const completed = state.missions.filter((mission) => mission.status === "Completed").length;
    const avgProgress = state.missions.length ? Math.round(state.missions.reduce((sum, mission) => sum + mission.progress, 0) / state.missions.length) : 0;
    const pendingApprovals = state.approvals.filter((approval) => approval.status === "Pending").length;
    const unreadMessages = state.messages.filter((message) => !message.read).length;
    const workspaceRows = state.workspaces.map((workspace) => ({
      ...workspace,
      missions: state.missions.filter((mission) => mission.workspaceId === workspace.id),
      knowledge: state.knowledge.filter((document) => document.workspaceId === workspace.id).length,
      memories: state.memories.filter((memory) => memory.workspaceId === workspace.id).length,
    }));

    return (
      <>
        {sectionHeader(
          "Executive Analytics",
          "Measure mission performance, company records, employee activity, approvals, content production, API spending, and workspace health.",
          "Live operational snapshot",
        )}
        <div className={styles.statsGrid}>
          <Metric label="Average mission progress" value={`${avgProgress}%`} detail={`${completed} completed`} />
          <Metric label="Pending approvals" value={pendingApprovals} detail="CEO decisions needed" />
          <Metric label="Unread messages" value={unreadMessages} detail="Employee and system updates" />
          <Metric label="Monthly API budget" value={`$${state.settings.apiMonthlyBudget}`} detail="Configured spending limit" />
        </div>
        <div className={styles.twoColumn}>
          <section className={styles.panel}>
            <div className={styles.panelHeading}><div><h2>Workspace health</h2><p>Current operational volume by company.</p></div></div>
            <div className={styles.analyticsList}>
              {workspaceRows.map((workspace) => {
                const progress = workspace.missions.length ? Math.round(workspace.missions.reduce((sum, mission) => sum + mission.progress, 0) / workspace.missions.length) : 0;
                return <article key={workspace.id}><div className={styles.rowBetween}><strong>{workspace.name}</strong><span>{progress}% mission health</span></div><div className={styles.progressTrack}><span style={{ width: `${progress}%` }} /></div><div className={styles.miniMetrics}><span>{workspace.missions.length} missions</span><span>{workspace.knowledge} documents</span><span>{workspace.memories} memories</span></div></article>;
              })}
            </div>
          </section>
          <section className={styles.panel}>
            <div className={styles.panelHeading}><div><h2>Mission status</h2><p>Where company work currently stands.</p></div></div>
            <div className={styles.barChart}>
              {(["Planning", "In Progress", "Blocked", "Review", "Completed"] as MissionStatus[]).map((status) => {
                const count = state.missions.filter((mission) => mission.status === status).length;
                const width = state.missions.length ? Math.max(5, Math.round((count / state.missions.length) * 100)) : 0;
                return <div key={status}><div className={styles.rowBetween}><span>{status}</span><strong>{count}</strong></div><div className={styles.chartTrack}><span style={{ width: `${width}%` }} /></div></div>;
              })}
            </div>
          </section>
        </div>
        <section className={styles.panel}>
          <div className={styles.panelHeading}><div><h2>Production and records</h2><p>Foundational metrics that will later connect to Supabase, social analytics, Cine jobs, Michael P reports, and external platforms.</p></div></div>
          <div className={styles.statsGridCompact}>
            <Metric label="Knowledge" value={state.knowledge.length} detail="Official records" />
            <Metric label="Memory" value={state.memories.length} detail="Learned company context" />
            <Metric label="Messages" value={state.messages.length} detail="Internal communication" />
            <Metric label="Approvals" value={state.approvals.length} detail="Audit decisions" />
          </div>
        </section>
      </>
    );
  }

  function renderSettings() {
    function saveSettings(event: FormEvent<HTMLFormElement>) {
      event.preventDefault();
      const form = new FormData(event.currentTarget);
      updateState((current) => ({
        ...current,
        settings: {
          ...current.settings,
          companyName: String(form.get("companyName") ?? current.settings.companyName),
          founderName: String(form.get("founderName") ?? current.settings.founderName),
          defaultWorkspaceId: String(form.get("defaultWorkspaceId") ?? current.settings.defaultWorkspaceId),
          apiMonthlyBudget: Number(form.get("apiMonthlyBudget") ?? current.settings.apiMonthlyBudget),
          dataRegion: String(form.get("dataRegion") ?? current.settings.dataRegion),
          approvalRequired: form.get("approvalRequired") === "on",
          socialPublishingApproval: form.get("socialPublishingApproval") === "on",
          accountingApproval: form.get("accountingApproval") === "on",
          notificationsEnabled: form.get("notificationsEnabled") === "on",
          autoBackupEnabled: form.get("autoBackupEnabled") === "on",
        },
      }), "RoyalOS settings were saved locally.");
    }

    function exportBackup() {
      const blob = new Blob([JSON.stringify(state, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `royalos-company-backup-${new Date().toISOString().slice(0, 10)}.json`;
      anchor.click();
      URL.revokeObjectURL(url);
      setNotice("A RoyalOS company-data backup was exported.");
    }

    function resetDemoData() {
      const confirmed = window.confirm("Reset the Core Operations prototype to its original seeded data? This does not affect .env.local or external accounts.");
      if (!confirmed) return;
      const reset = resetCoreOperationsState({ sourceId });
      stateRef.current = reset;
      setState(reset);
      setNotice("Core Operations data was reset to the original seed.");
    }

    return (
      <>
        {sectionHeader(
          "RoyalOS Settings",
          "Control organization identity, approval rules, API budgets, notifications, backups, security posture, and future team access.",
          "Configuration center",
        )}
        {noticeBanner()}
        <div className={styles.twoColumnWide}>
          <section className={styles.panel}>
            <div className={styles.panelHeading}><div><h2>Organization settings</h2><p>These values shape the default behavior of the operating system.</p></div></div>
            <form className={styles.formStack} onSubmit={saveSettings}>
              <div className={styles.formGrid}>
                <label>Company name<input name="companyName" defaultValue={state.settings.companyName} /></label>
                <label>Founder name<input name="founderName" defaultValue={state.settings.founderName} /></label>
              </div>
              <label>Default workspace<select name="defaultWorkspaceId" defaultValue={state.settings.defaultWorkspaceId}>{state.workspaces.map((workspace) => <option key={workspace.id} value={workspace.id}>{workspace.name}</option>)}</select></label>
              <div className={styles.formGrid}>
                <label>Monthly API budget<input name="apiMonthlyBudget" type="number" min="0" step="1" defaultValue={state.settings.apiMonthlyBudget} /></label>
                <label>Data region<select name="dataRegion" defaultValue={state.settings.dataRegion}><option>United States</option><option>Canada</option><option>United Kingdom</option><option>European Union</option><option>Other</option></select></label>
              </div>
              <fieldset className={styles.checkGroup}>
                <legend>Approval and safety rules</legend>
                <Check name="approvalRequired" defaultChecked={state.settings.approvalRequired} label="Require approval for sensitive employee actions" />
                <Check name="socialPublishingApproval" defaultChecked={state.settings.socialPublishingApproval} label="Require CEO approval before social publishing" />
                <Check name="accountingApproval" defaultChecked={state.settings.accountingApproval} label="Require approval for major accounting corrections" />
                <Check name="notificationsEnabled" defaultChecked={state.settings.notificationsEnabled} label="Enable employee and system notifications" />
                <Check name="autoBackupEnabled" defaultChecked={state.settings.autoBackupEnabled} label="Prepare automatic company-data backups" />
              </fieldset>
              <button className={styles.primaryButton} type="submit">Save settings</button>
            </form>
          </section>
          <section className={styles.panel}>
            <div className={styles.panelHeading}><div><h2>Data and deployment</h2><p>Local prototype controls now; Supabase, multi-user access, encryption, and cloud backups next.</p></div></div>
            <div className={styles.settingsCards}>
              <article><strong>Environment secrets</strong><p>Keep API keys inside .env.local and never inside shared ZIP packages.</p><span className={`${styles.status} ${styles.statusGood}`}>Protected workflow</span></article>
              <article><strong>Company data</strong><p>Core Operations currently persists in the browser and is structured for Supabase migration.</p><span className={`${styles.status} ${styles.statusWarn}`}>Migration ready</span></article>
              <article><strong>Account connections</strong><p>Use the Connections tab for OAuth providers and employee permission scopes.</p><span className={`${styles.status} ${styles.statusNeutral}`}>Configuration phase</span></article>
            </div>
            <div className={styles.actionStack}>
              <button className={styles.secondaryButton} type="button" onClick={exportBackup}>Export company-data backup</button>
              <button className={styles.rejectButton} type="button" onClick={resetDemoData}>Reset Core Operations data</button>
            </div>
          </section>
        </div>
        <ProviderEquipmentSettings />
      </>
    );
  }

  const renderers: Record<CoreOperationsSection, () => React.ReactNode> = {
    Workspaces: renderWorkspaces,
    Missions: renderMissions,
    Approvals: renderApprovals,
    Knowledge: renderKnowledge,
    Memory: renderMemory,
    Messages: renderMessages,
    Analytics: renderAnalytics,
    Settings: renderSettings,
  };

  return <div className={styles.shell}>{renderers[section]()}</div>;
}

function Metric({ label, value, detail }: { label: string; value: string | number; detail: string }) {
  return (
    <article className={styles.metric}>
      <span>{label}</span>
      <strong>{value}</strong>
      <small>{detail}</small>
    </article>
  );
}

function Check({ name, defaultChecked, label }: { name: string; defaultChecked: boolean; label: string }) {
  return (
    <label className={styles.checkRow}>
      <input type="checkbox" name={name} defaultChecked={defaultChecked} />
      <span>{label}</span>
    </label>
  );
}
