import { useEffect, useState, useRef } from "react";
import { AlertCircle, X, ArrowLeft } from "lucide-react";
import { api, post, example } from "./lib.js";
import {
  Sidebar,
  PageHeader,
  Steps,
  BriefForm,
  Preview,
  ConnectionStrip,
} from "./components/Workspace.jsx";
import { Review, Payments, SavedProjects } from "./components/Proposal.jsx";
import Connections from "./components/Connections.jsx";

export default function App() {
  const [view, setView] = useState("new"),
    [input, setInput] = useState({ ...example }),
    [project, setProject] = useState(null),
    [projects, setProjects] = useState([]);
  const [status, setStatus] = useState(null),
    [connections, setConnections] = useState(false),
    [refreshing, setRefreshing] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [returnInfo, setReturnInfo] = useState(null);
  const heading = useRef(null);
  const step = project ? (project.state === "draft" ? 1 : 2) : 0;
  async function refresh() {
    setRefreshing(true);
    try {
      setStatus(await api("/status"));
    } catch (e) {
      setError(e.message);
    } finally {
      setRefreshing(false);
    }
  }
  async function loadProjects() {
    try {
      setProjects(await api("/projects"));
    } catch (e) {
      setError(e.message);
    }
  }
  useEffect(() => {
    refresh();
    loadProjects();
    const query = new URLSearchParams(window.location.search);
    const id = query.get("project");
    if (id)
      api(`/projects/${encodeURIComponent(id)}`)
        .then((p) => {
          setProject(p);
          const index = Number(query.get("milestone"));
          if (
            Number.isInteger(index) &&
            index >= 0 &&
            index < p.milestones.length
          )
            setReturnInfo({
              index,
              token: query.get("token"),
              cancelled: query.get("cancelled") === "1",
            });
        })
        .catch((e) => setError(e.message));
  }, []);
  useEffect(() => {
    const timer = setInterval(
      () =>
        api("/status")
          .then(setStatus)
          .catch(() => {}),
      30000,
    );
    return () => clearInterval(timer);
  }, []);
  function navigate(next) {
    if (next === "connections") {
      setConnections(true);
      return;
    }
    setError("");
    setView(next);
    setProject(null);
    setReturnInfo(null);
    window.history.replaceState({}, "", "/");
    if (next === "saved") loadProjects();
  }
  function openProject(p) {
    setProject(p);
    setView("new");
    setReturnInfo(null);
    setError("");
    window.history.replaceState({}, "", `/?project=${p.id}`);
  }
  async function generate(e) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const generated = await post("/proposals", input);
      setProject(generated);
      window.history.replaceState({}, "", `/?project=${generated.id}`);
      loadProjects();
      heading.current?.focus();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  function updated(p) {
    setProject(p);
    setError("");
    loadProjects();
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
  return (
    <div className="app-shell">
      <Sidebar view={view} onNavigate={navigate} />
      <main ref={heading} tabIndex={-1}>
        <PageHeader view={view} step={step} />
        {view !== "saved" && <Steps step={step} />}
        <div aria-live="polite">
          {error && (
            <div className="error-message" role="alert">
              <AlertCircle size={20} />
              <span>{error}</span>
              <button
                className="icon-button"
                aria-label="Dismiss error"
                onClick={() => setError("")}
              >
                <X size={18} />
              </button>
            </div>
          )}
        </div>
        {view === "saved" ? (
          <SavedProjects
            projects={projects}
            onOpen={openProject}
            onNew={() => navigate("new")}
          />
        ) : project ? (
          <>
            <button
              className="text-button back-link"
              onClick={() => navigate("saved")}
            >
              <ArrowLeft size={16} />
              Saved projects
            </button>
            {step === 1 ? (
              <Review
                key={project.id}
                project={project}
                onApproved={updated}
                onError={setError}
              />
            ) : (
              <Payments
                key={project.id}
                project={project}
                status={status}
                onUpdated={updated}
                onError={setError}
                onConnections={() => setConnections(true)}
                returnInfo={returnInfo}
                onDismissReturn={() => {
                  setReturnInfo(null);
                  window.history.replaceState(
                    {},
                    "",
                    `/?project=${project.id}`,
                  );
                }}
              />
            )}
          </>
        ) : (
          <div className="brief-layout">
            <BriefForm
              input={input}
              setInput={setInput}
              onGenerate={generate}
              busy={busy}
            />
            <Preview />
          </div>
        )}
        <ConnectionStrip status={status} onOpen={() => setConnections(true)} />
      </main>
      {connections && (
        <Connections
          status={status}
          onClose={() => setConnections(false)}
          onRefresh={refresh}
          refreshing={refreshing}
        />
      )}
    </div>
  );
}
