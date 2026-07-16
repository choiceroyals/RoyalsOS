"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { EMPLOYEE_EQUIPMENT } from "@/lib/employees/equipment";
import { ROYALOS_EMPLOYEE_PROFILES, type RoyalOSEmployeeName } from "@/lib/employees/config";
import { loadCoreOperationsState, saveCoreOperationsState } from "@/lib/core-operations/storage";
import type { MissionPriority } from "@/lib/core-operations/types";
import styles from "./EmployeeDirectory.module.css";

const WORKSPACES = [
  ["workspace-triple-hay", "Triple-Hay Concept LLC"],
  ["workspace-choice-royals", "ChoiceRoyals"],
  ["workspace-xena-grace", "Xena Grace"],
  ["workspace-td-talk", "TD Talk"],
] as const;

export default function EmployeeDirectory() {
  const [selectedName, setSelectedName] = useState<RoyalOSEmployeeName>("Adedeji");
  const [query, setQuery] = useState("");
  const [assignOpen, setAssignOpen] = useState(false);
  const [taskTitle, setTaskTitle] = useState("");
  const [taskDescription, setTaskDescription] = useState("");
  const [workspaceId, setWorkspaceId] = useState("workspace-choice-royals");
  const [priority, setPriority] = useState<MissionPriority>("Normal");
  const [confirmation, setConfirmation] = useState("");
  const [pluginAssignments, setPluginAssignments] = useState<Array<{ pluginName: string; employee: string; capabilities: string[]; status: string }>>([]);


  useEffect(() => {
    void fetch("/api/plugins", { cache: "no-store" })
      .then((response) => response.json())
      .then((data: { installed?: Array<{ enabled: boolean; manifest: { name: string; assignedEmployees?: string[]; capabilities: string[] }; lastHealthCheck?: { status: string } }> }) => {
        setPluginAssignments((data.installed ?? []).filter((plugin) => plugin.enabled).flatMap((plugin) => (plugin.manifest.assignedEmployees ?? []).map((employee) => ({ pluginName: plugin.manifest.name, employee, capabilities: plugin.manifest.capabilities, status: plugin.lastHealthCheck?.status ?? "unchecked" }))));
      })
      .catch(() => setPluginAssignments([]));
  }, []);

  const selected = ROYALOS_EMPLOYEE_PROFILES.find((item) => item.name === selectedName) ?? ROYALOS_EMPLOYEE_PROFILES[0];
  const equipment = EMPLOYEE_EQUIPMENT[selected.name];
  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return ROYALOS_EMPLOYEE_PROFILES;
    return ROYALOS_EMPLOYEE_PROFILES.filter((employee) =>
      [employee.name, employee.title, employee.department, employee.routingDescription]
        .join(" ")
        .toLowerCase()
        .includes(term),
    );
  }, [query]);

  function assignTask(event: FormEvent) {
    event.preventDefault();
    if (!taskTitle.trim() || !taskDescription.trim()) return;
    const state = loadCoreOperationsState();
    const now = new Date().toISOString();
    state.missions.unshift({
      id: `mission-direct-${Date.now()}`,
      title: taskTitle.trim(),
      workspaceId,
      description: taskDescription.trim(),
      leadEmployee: selected.name,
      supportingEmployees: [],
      priority,
      status: "Planning",
      progress: 0,
      dueDate: "",
      createdAt: now,
      updatedAt: now,
    });
    saveCoreOperationsState(state);
    setConfirmation(`Task assigned directly to ${selected.name}.`);
    setTaskTitle("");
    setTaskDescription("");
    setAssignOpen(false);
  }

  return (
    <div className={styles.center}>
      <section className={styles.hero}>
        <div><span>RoyalOS workforce</span><h1>Employee Directory</h1><p>Open any employee profile, review their equipment and boundaries, and assign specialist work directly without routing through Adedeji.</p></div>
        <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search employees, departments, or skills" />
      </section>
      {confirmation ? <div className={styles.confirmation}>{confirmation}</div> : null}
      <div className={styles.layout}>
        <aside className={styles.directory}>
          {filtered.map((employee) => (
            <button key={employee.name} type="button" className={selected.name === employee.name ? styles.active : ""} onClick={() => setSelectedName(employee.name)}>
              <span>{employee.initials}</span><div><b>{employee.name}</b><small>{employee.shortRole}</small></div><i>{employee.status}</i>
            </button>
          ))}
        </aside>
        <main className={styles.profile}>
          <header>
            <div className={styles.avatar}><img src={selected.image} alt={selected.name} onError={(event) => { event.currentTarget.style.display = "none"; }} /><span>{selected.initials}</span></div>
            <div><span>{selected.department}</span><h2>{selected.name}</h2><h3>{selected.title}</h3><p>{selected.routingDescription}</p></div>
            <button type="button" onClick={() => setAssignOpen(true)}>Assign task</button>
          </header>
          <section className={styles.statusRow}><span><b>Status</b>{selected.status}</span><span><b>Current focus</b>{selected.assignment}</span><span><b>Department</b>{selected.department}</span></section>
          <div className={styles.profileGrid}>
            <section><h3>Responsibilities</h3>{equipment.responsibilities.map((item) => <p key={item}>✓ {item}</p>)}</section>
            <section><h3>Capabilities</h3>{equipment.capabilities.map((item) => <p key={item}>◆ {item}</p>)}</section>
            <section><h3>Tools & integrations</h3>{equipment.connectedTools.map((item) => <p key={item}>▣ {item}</p>)}</section>
            <section><h3>Installed capability plugins</h3>{pluginAssignments.filter((plugin) => plugin.employee === selected.name).length ? pluginAssignments.filter((plugin) => plugin.employee === selected.name).map((plugin) => <p key={`${plugin.pluginName}-${plugin.employee}`}>◉ {plugin.pluginName} · {plugin.status}</p>) : <p>Install or assign plugins from the Plugin Marketplace.</p>}</section>
            <section><h3>Reports</h3>{equipment.reportTypes.map((item) => <p key={item}>▤ {item}</p>)}</section>
            <section className={styles.wide}><h3>Approval boundaries</h3>{equipment.approvalBoundaries.map((item) => <p key={item}>⚠ {item}</p>)}</section>
            <section className={styles.wide}><h3>Escalation paths</h3>{equipment.escalationPaths.map((item) => <p key={item}>→ {item}</p>)}</section>
          </div>
        </main>
      </div>
      {assignOpen ? (
        <div className={styles.backdrop} onClick={() => setAssignOpen(false)}>
          <form className={styles.modal} onSubmit={assignTask} onClick={(event) => event.stopPropagation()}>
            <div><h2>Assign directly to {selected.name}</h2><button type="button" onClick={() => setAssignOpen(false)}>×</button></div>
            <label><span>Task title</span><input value={taskTitle} onChange={(event) => setTaskTitle(event.target.value)} required /></label>
            <label><span>Instructions</span><textarea value={taskDescription} onChange={(event) => setTaskDescription(event.target.value)} required /></label>
            <label><span>Workspace</span><select value={workspaceId} onChange={(event) => setWorkspaceId(event.target.value)}>{WORKSPACES.map(([id, name]) => <option key={id} value={id}>{name}</option>)}</select></label>
            <label><span>Priority</span><select value={priority} onChange={(event) => setPriority(event.target.value as MissionPriority)}>{["Low", "Normal", "High", "Critical"].map((item) => <option key={item}>{item}</option>)}</select></label>
            <button type="submit">Create direct mission</button>
          </form>
        </div>
      ) : null}
    </div>
  );
}
