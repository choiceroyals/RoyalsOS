"use client";

import { useEffect, useMemo, useState } from "react";

type Workspace =
  | "Triple-Hay Concept LLC"
  | "ChoiceRoyals"
  | "Xena Grace"
  | "TD Talk";

type Employee =
  | "Adedeji"
  | "Emmy"
  | "Atlas"
  | "Nova"
  | "Jack"
  | "Tyson"
  | "Titan"
  | "Janet"
  | "Orion";

type TaskStatus = "Saved" | "Approved";
type WorkMode = "Task" | "Mission";

type Task = {
  id: number;
  workspace: Workspace;
  employee: Employee;
  idea: string;
  draft: string;
  time: string;
  status: TaskStatus;
  mode: WorkMode;
};

const workspaces: Workspace[] = [
  "Triple-Hay Concept LLC",
  "ChoiceRoyals",
  "Xena Grace",
  "TD Talk",
];

const employees: { name: Employee; role: string; icon: string; department: string }[] = [
  { name: "Adedeji", role: "Executive Assistant", icon: "🧠", department: "Executive Office" },
  { name: "Emmy", role: "Content Operations", icon: "👩", department: "Marketing" },
  { name: "Atlas", role: "Research Manager", icon: "📚", department: "Research" },
  { name: "Nova", role: "Creative Director", icon: "🎨", department: "Creative" },
  { name: "Jack", role: "Video Production Director", icon: "🎬", department: "Creative" },
  { name: "Tyson", role: "Analytics Manager", icon: "📊", department: "Analytics" },
  { name: "Titan", role: "Business Operations", icon: "🏢", department: "Operations" },
  { name: "Janet", role: "Customer Success", icon: "💬", department: "Customer Success" },
  { name: "Orion", role: "Automation Engineer", icon: "🤖", department: "Automation" },
];

const departments = [
  "Executive Office",
  "Marketing",
  "Research",
  "Creative",
  "Analytics",
  "Operations",
  "Customer Success",
  "Automation",
];

function employeeStatus(name: Employee, loading: boolean, mode: WorkMode, selected: Employee) {
  if (!loading) return "Online";
  if (mode === "Mission" && name !== "Adedeji") return "Reporting...";
  if (mode === "Mission" && name === "Adedeji") return "Coordinating...";
  if (name === selected) return "Working...";
  return "Online";
}

function progressFor(name: Employee, loading: boolean) {
  if (!loading) return 100;
  const values: Record<Employee, number> = {
    Adedeji: 82,
    Emmy: 64,
    Atlas: 71,
    Nova: 55,
    Jack: 49,
    Tyson: 68,
    Titan: 58,
    Janet: 61,
    Orion: 45,
  };
  return values[name];
}

export default function Home() {
  const [workspace, setWorkspace] = useState<Workspace>("Triple-Hay Concept LLC");
  const [employee, setEmployee] = useState<Employee>("Adedeji");
  const [idea, setIdea] = useState("");
  const [draft, setDraft] = useState("");
  const [loading, setLoading] = useState(false);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [mode, setMode] = useState<WorkMode>("Mission");
  const [notifications, setNotifications] = useState<string[]>([]);

  useEffect(() => {
    const saved = localStorage.getItem("royalos-tasks");
    if (saved) setTasks(JSON.parse(saved));

    const savedNotes = localStorage.getItem("royalos-notifications");
    if (savedNotes) setNotifications(JSON.parse(savedNotes));
  }, []);

  useEffect(() => {
    localStorage.setItem("royalos-tasks", JSON.stringify(tasks));
  }, [tasks]);

  useEffect(() => {
    localStorage.setItem("royalos-notifications", JSON.stringify(notifications));
  }, [notifications]);

  const currentEmployee = employees.find((e) => e.name === employee);
  const workspaceTasks = tasks.filter((task) => task.workspace === workspace);
  const approvedTasks = tasks.filter((task) => task.status === "Approved").length;
  const missionTasks = tasks.filter((task) => task.mode === "Mission").length;

  const companyIntelligence = useMemo(() => {
    return tasks.slice(0, 8);
  }, [tasks]);

  async function assignWork() {
    if (!idea.trim()) {
      setDraft("Boss, give RoyalOS a mission or task first.");
      return;
    }

    const startedAt = new Date().toLocaleString();

    setNotifications((prev) => [
      `${startedAt} — Boss assigned ${mode}: ${idea}`,
      `${startedAt} — Adedeji started coordination.`,
      ...prev,
    ]);

    try {
      setLoading(true);
      setDraft("");

      const res = await fetch("/api/emmy", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          idea,
          workspace,
          employee,
          mode,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Something went wrong.");
      }

      const newTask: Task = {
        id: Date.now(),
        workspace,
        employee,
        idea,
        draft: data.draft,
        time: new Date().toLocaleString(),
        status: "Saved",
        mode,
      };

      setDraft(data.draft);
      setTasks([newTask, ...tasks]);

      const doneAt = new Date().toLocaleString();
      setNotifications((prev) => [
        `${doneAt} — ${mode === "Mission" ? "Adedeji completed executive briefing." : `${employee} completed task.`}`,
        `${doneAt} — Saved to Company Intelligence.`,
        ...prev,
      ]);

      setIdea("");
    } catch (error) {
      console.error(error);
      setDraft("RoyalOS could not complete this request. Check terminal.");
      setNotifications((prev) => [
        `${new Date().toLocaleString()} — Error: RoyalOS could not complete the request.`,
        ...prev,
      ]);
    } finally {
      setLoading(false);
    }
  }

  function approveTask(id: number) {
    setTasks(tasks.map((task) => (task.id === id ? { ...task, status: "Approved" } : task)));
    setNotifications((prev) => [
      `${new Date().toLocaleString()} — Boss approved a work item.`,
      ...prev,
    ]);
  }

  function deleteTask(id: number) {
    setTasks(tasks.filter((task) => task.id !== id));
    setNotifications((prev) => [
      `${new Date().toLocaleString()} — Work item deleted.`,
      ...prev,
    ]);
  }

  function clearTasks() {
    setTasks([]);
    localStorage.removeItem("royalos-tasks");
  }

  function clearNotifications() {
    setNotifications([]);
    localStorage.removeItem("royalos-notifications");
  }

  return (
    <main className="min-h-screen bg-[#070812] text-white flex">
      <aside className="w-72 bg-black/40 border-r border-white/10 p-6 hidden md:block">
        <h1 className="text-3xl font-bold">👑 RoyalOS</h1>
        <p className="text-gray-400 mt-2">Executive Command Center</p>

        <div className="mt-8 bg-purple-600/20 border border-purple-500/30 rounded-2xl p-4">
          <p className="text-sm text-purple-300">Parent Company</p>
          <h2 className="font-bold mt-1">Triple-Hay Concept LLC</h2>
          <p className="text-xs text-gray-400 mt-2">
            The company behind ChoiceRoyals, Xena Grace, TD Talk, and RoyalOS.
          </p>
        </div>

        <div className="mt-8 space-y-3">
          <p className="text-purple-400 font-semibold">Navigation</p>
          {[
            "Dashboard",
            "Mission Command",
            "Departments",
            "AI Workforce",
            "Notifications",
            "Company Intelligence",
          ].map((item) => (
            <div key={item} className="bg-white/10 rounded-xl px-4 py-3">
              {item}
            </div>
          ))}
        </div>
      </aside>

      <section className="flex-1 p-8">
        <p className="text-purple-400 font-semibold">AI Workforce Command Center</p>

        <h2 className="text-5xl font-bold mt-3">Good evening, Ayobami</h2>

        <p className="text-gray-400 mt-3">
          Adedeji coordinates the workforce. Employees report back into one executive briefing.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-5 gap-6 mt-8">
          <div className="bg-white/10 rounded-2xl p-6 border border-white/10">
            <h3 className="text-3xl font-bold">4</h3>
            <p className="text-gray-400">Workspaces</p>
          </div>

          <div className="bg-white/10 rounded-2xl p-6 border border-white/10">
            <h3 className="text-3xl font-bold">{employees.length}</h3>
            <p className="text-gray-400">AI Employees</p>
          </div>

          <div className="bg-white/10 rounded-2xl p-6 border border-white/10">
            <h3 className="text-3xl font-bold">{tasks.length}</h3>
            <p className="text-gray-400">Work Items</p>
          </div>

          <div className="bg-white/10 rounded-2xl p-6 border border-white/10">
            <h3 className="text-3xl font-bold">{missionTasks}</h3>
            <p className="text-gray-400">Missions</p>
          </div>

          <div className="bg-white/10 rounded-2xl p-6 border border-white/10">
            <h3 className="text-3xl font-bold">{approvedTasks}</h3>
            <p className="text-gray-400">Approved</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 mt-8">
          <div className="bg-white/10 border border-white/10 rounded-3xl p-6">
            <h3 className="text-xl font-bold">Company & Workspaces</h3>

            <div className="mt-4 space-y-3">
              {workspaces.map((item) => (
                <button
                  key={item}
                  onClick={() => setWorkspace(item)}
                  className={`w-full text-left px-4 py-3 rounded-xl ${
                    workspace === item ? "bg-purple-600" : "bg-black/40"
                  }`}
                >
                  {item}
                </button>
              ))}
            </div>
          </div>

          <div className="lg:col-span-3 bg-white/10 border border-white/10 rounded-3xl p-6">
            <h3 className="text-xl font-bold">Department Structure</h3>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-4">
              {departments.map((department) => (
                <div key={department} className="bg-black/40 border border-white/10 rounded-2xl p-4">
                  <h4 className="font-bold text-purple-300">{department}</h4>

                  <div className="mt-3 space-y-3">
                    {employees
                      .filter((item) => item.department === department)
                      .map((item) => (
                        <button
                          key={item.name}
                          onClick={() => setEmployee(item.name)}
                          className={`w-full text-left p-3 rounded-xl border ${
                            employee === item.name
                              ? "bg-purple-600/40 border-purple-400"
                              : "bg-white/5 border-white/10"
                          }`}
                        >
                          <p className="text-xl">{item.icon}</p>
                          <p className="font-bold">{item.name}</p>
                          <p className="text-xs text-gray-400">{item.role}</p>

                          <p className="text-green-400 text-xs mt-2">
                            ● {employeeStatus(item.name, loading, mode, employee)}
                          </p>

                          <div className="w-full bg-white/10 h-2 rounded-full mt-2">
                            <div
                              className={`h-2 rounded-full ${
                                loading ? "bg-purple-500 animate-pulse" : "bg-green-500"
                              }`}
                              style={{
                                width: `${progressFor(item.name, loading)}%`,
                              }}
                            />
                          </div>
                        </button>
                      ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-8">
          <div className="lg:col-span-2 bg-white/10 border border-purple-500/30 rounded-3xl p-8">
            <p className="text-green-400 font-semibold">● {employee} Online</p>

            <h2 className="text-3xl font-bold mt-3">
              {currentEmployee?.icon} {employee} — {currentEmployee?.role}
            </h2>

            <p className="text-gray-400 mt-2">
              Current workspace: <span className="text-purple-300">{workspace}</span>
            </p>

            <div className="flex flex-wrap gap-3 mt-6">
              <button
                onClick={() => {
                  setMode("Mission");
                  setEmployee("Adedeji");
                }}
                className={`px-4 py-3 rounded-xl ${
                  mode === "Mission" ? "bg-purple-600" : "bg-black/40"
                }`}
              >
                Mission Command
              </button>

              <button
                onClick={() => setMode("Task")}
                className={`px-4 py-3 rounded-xl ${
                  mode === "Task" ? "bg-purple-600" : "bg-black/40"
                }`}
              >
                Single Employee Task
              </button>
            </div>

            <textarea
              value={idea}
              onChange={(e) => setIdea(e.target.value)}
              className="w-full mt-6 bg-black/40 border border-white/10 rounded-2xl p-4 text-white"
              rows={5}
              placeholder={
                mode === "Mission"
                  ? "Example: Launch Xena Grace new song Mercy Found Me..."
                  : `Assign ${employee} a task for ${workspace}...`
              }
            />

            <button
              onClick={assignWork}
              disabled={loading}
              className="mt-4 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 px-6 py-3 rounded-xl font-semibold"
            >
              {loading
                ? mode === "Mission"
                  ? "Adedeji is coordinating..."
                  : `${employee} is working...`
                : mode === "Mission"
                ? "Launch Mission"
                : "Assign Task"}
            </button>

            {loading && (
              <div className="mt-6 bg-black/40 rounded-2xl p-6 border border-white/10">
                <p className="text-purple-300">
                  {mode === "Mission"
                    ? "Adedeji is coordinating the workforce and preparing one executive briefing..."
                    : `${employee} is working...`}
                </p>

                <div className="w-full bg-white/10 h-3 rounded-full mt-4">
                  <div className="bg-purple-500 h-3 w-2/3 rounded-full animate-pulse"></div>
                </div>
              </div>
            )}

            {draft && !loading && (
              <div className="mt-6 bg-black/50 border border-white/10 rounded-2xl p-6">
                <div className="flex justify-between gap-4">
                  <div>
                    <p className="text-green-400">✅ Work Completed</p>
                    <h3 className="text-2xl font-bold">
                      {mode === "Mission" ? "Adedeji Executive Briefing" : `${employee} Report`}
                    </h3>
                  </div>

                  <button
                    onClick={() => navigator.clipboard.writeText(draft)}
                    className="bg-white/10 hover:bg-white/20 px-4 py-2 rounded-xl text-sm h-fit"
                  >
                    Copy Report
                  </button>
                </div>

                <pre className="whitespace-pre-wrap leading-relaxed mt-5 text-gray-200">
                  {draft}
                </pre>
              </div>
            )}
          </div>

          <div className="space-y-6">
            <div className="bg-white/10 border border-white/10 rounded-3xl p-6">
              <div className="flex justify-between">
                <h2 className="text-2xl font-bold">Executive Notifications</h2>

                <button onClick={clearNotifications} className="text-red-300 text-sm">
                  Clear
                </button>
              </div>

              <div className="mt-5 space-y-3 max-h-72 overflow-y-auto">
                {notifications.length === 0 && (
                  <p className="text-gray-500">No notifications yet.</p>
                )}

                {notifications.map((note, index) => (
                  <div key={index} className="bg-black/40 border border-white/10 rounded-xl p-3">
                    <p className="text-sm text-gray-300">{note}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white/10 border border-white/10 rounded-3xl p-6">
              <div className="flex justify-between">
                <h2 className="text-2xl font-bold">Company Intelligence</h2>

                <button onClick={clearTasks} className="text-red-300 text-sm">
                  Clear
                </button>
              </div>

              <p className="text-gray-400 mt-2">Saved work becomes company memory.</p>

              <div className="mt-5 space-y-3 max-h-72 overflow-y-auto">
                {companyIntelligence.length === 0 && (
                  <p className="text-gray-500">No company intelligence yet.</p>
                )}

                {companyIntelligence.map((task) => (
                  <div key={task.id} className="bg-black/40 border border-white/10 rounded-xl p-3">
                    <p className="text-xs text-purple-300">
                      {task.workspace} • {task.employee} • {task.mode}
                    </p>
                    <h3 className="font-bold mt-1">{task.idea}</h3>
                    <div className="flex gap-2 mt-3">
                      <button
                        onClick={() => setDraft(task.draft)}
                        className="bg-white/10 px-3 py-2 rounded-lg text-sm"
                      >
                        View
                      </button>
                      <button
                        onClick={() => navigator.clipboard.writeText(task.draft)}
                        className="bg-white/10 px-3 py-2 rounded-lg text-sm"
                      >
                        Copy
                      </button>
                      <button
                        onClick={() => approveTask(task.id)}
                        className="bg-white/10 text-green-300 px-3 py-2 rounded-lg text-sm"
                      >
                        Approve
                      </button>
                      <button
                        onClick={() => deleteTask(task.id)}
                        className="bg-white/10 text-red-300 px-3 py-2 rounded-lg text-sm"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white/10 border border-white/10 rounded-3xl p-6">
              <h2 className="text-2xl font-bold">Mission Memory</h2>
              <p className="text-gray-400 mt-2">{workspace} saved work</p>

              <div className="grid grid-cols-2 gap-3 mt-5">
                <div className="bg-black/40 rounded-xl p-3">
                  <h3 className="text-2xl font-bold">{missionTasks}</h3>
                  <p className="text-gray-400 text-sm">Missions</p>
                </div>

                <div className="bg-black/40 rounded-xl p-3">
                  <h3 className="text-2xl font-bold">{workspaceTasks.length}</h3>
                  <p className="text-gray-400 text-sm">Workspace Items</p>
                </div>
              </div>

              <div className="mt-6 space-y-4 max-h-72 overflow-y-auto">
                {workspaceTasks.length === 0 && (
                  <p className="text-gray-500">No saved work for this workspace yet.</p>
                )}

                {workspaceTasks.map((task) => (
                  <div key={task.id} className="bg-black/40 rounded-2xl p-4 border border-white/10">
                    <p
                      className={
                        task.status === "Approved"
                          ? "text-green-400 text-sm"
                          : "text-yellow-300 text-sm"
                      }
                    >
                      {task.status === "Approved" ? "✅ Approved" : "💾 Saved"} • {task.mode}
                    </p>

                    <h3 className="font-bold mt-1">{task.idea}</h3>

                    <p className="text-gray-500 text-sm">
                      {task.employee} • {task.time}
                    </p>

                    <div className="flex flex-wrap gap-2 mt-3">
                      <button
                        onClick={() => setDraft(task.draft)}
                        className="bg-white/10 px-3 py-2 rounded-lg text-sm"
                      >
                        View
                      </button>

                      <button
                        onClick={() => navigator.clipboard.writeText(task.draft)}
                        className="bg-white/10 px-3 py-2 rounded-lg text-sm"
                      >
                        Copy
                      </button>

                      <button
                        onClick={() => approveTask(task.id)}
                        className="bg-white/10 text-green-300 px-3 py-2 rounded-lg text-sm"
                      >
                        Approve
                      </button>

                      <button
                        onClick={() => deleteTask(task.id)}
                        className="bg-white/10 text-red-300 px-3 py-2 rounded-lg text-sm"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}