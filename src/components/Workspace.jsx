import {
  FileText,
  FolderOpen,
  Plug,
  Zap,
  ChevronRight,
  FlaskConical,
  ArrowRight,
  ShieldCheck,
  LoaderCircle,
  Cpu,
  Wallet,
} from "lucide-react";
import { hosted } from "../hosting.js";
import { example, preview } from "../lib.js";

export function Sidebar({ view, onNavigate }) {
  return (
    <aside className="sidebar">
      <a
        className="brand"
        href="/"
        onClick={(e) => {
          e.preventDefault();
          onNavigate("new");
        }}
      >
        <span className="brand-mark">S</span>ScopePay
      </a>
      <span className="nav-label">Workspace</span>
      <nav aria-label="Workspace">
        {[
          [FileText, "new", "New proposal"],
          [FolderOpen, "saved", "Saved projects"],
          [Plug, "connections", "Connections"],
        ].map(([Icon, key, label]) => (
          <button
            key={key}
            className={`nav-item ${view === key ? "active" : ""}`}
            onClick={() => onNavigate(key)}
          >
            <Icon size={20} />
            {label}
          </button>
        ))}
      </nav>
      <button className="local-link" onClick={() => onNavigate("connections")}>
        <Zap size={20} />
        {hosted ? "Cloud AI" : "Local-first AI"}
        <ChevronRight size={17} />
      </button>
    </aside>
  );
}
export function PageHeader({ view, step }) {
  const name =
    view === "saved"
      ? "Saved projects"
      : step === 1
        ? "Review scope"
        : step === 2
          ? "Collect payment"
          : "New proposal";
  return (
    <>
      <header className="topbar">
        <div className="breadcrumb">
          Workspace <span>/</span> <strong>{name}</strong>
        </div>
        <span className="sandbox">
          <FlaskConical size={16} />
          Sandbox mode
        </span>
      </header>
      <div className="heading">
        <h1>
          {view === "saved"
            ? "Your work, clearly scoped."
            : "Good work starts with a clear scope."}
        </h1>
        <p>
          {view === "saved"
            ? hosted
              ? "Your projects belong to this browser workspace. Keep this browser session to return to them."
              : "Pick up where you left off. Your projects are saved on this machine."
            : "Turn a client brief into milestones you can get paid for."}
        </p>
      </div>
    </>
  );
}
export function Steps({ step }) {
  return (
    <ol className="steps" aria-label="Proposal progress">
      {["Brief", "Review scope", "Collect payment"].map((label, i) => (
        <li
          className={i <= step ? "current" : ""}
          aria-current={i === step ? "step" : undefined}
          key={label}
        >
          <span>{i + 1}</span>
          <strong>{label}</strong>
        </li>
      ))}
    </ol>
  );
}
export function BriefForm({ input, setInput, onGenerate, busy }) {
  return (
    <section className="panel brief-panel">
      <h2>Tell us about the project</h2>
      <p className="muted">
        Share a few details and we’ll turn your brief into a clear, payable
        scope.
      </p>
      <form onSubmit={onGenerate}>
        <label htmlFor="client">Client name</label>
        <input
          id="client"
          value={input.client}
          required
          maxLength={100}
          disabled={busy}
          onChange={(e) => setInput({ ...input, client: e.target.value })}
        />
        <label htmlFor="budget">Project budget (USD)</label>
        <div className="money-input">
          <span>$</span>
          <input
            id="budget"
            type="number"
            min="10"
            max="100000"
            step="0.01"
            required
            value={input.budget}
            disabled={busy}
            onChange={(e) => setInput({ ...input, budget: e.target.value })}
          />
        </div>
        <label htmlFor="brief">Project brief</label>
        <textarea
          id="brief"
          value={input.brief}
          minLength={30}
          maxLength={6000}
          required
          disabled={busy}
          onChange={(e) => setInput({ ...input, brief: e.target.value })}
        />
        <div className="form-actions">
          <button className="button primary" disabled={busy} type="submit">
            {busy ? (
              <>
                <LoaderCircle className="spin" size={18} />
                {hosted ? "Generating proposal…" : "Generating locally…"}
              </>
            ) : (
              <>
                Generate proposal
                <ArrowRight size={18} />
              </>
            )}
          </button>
          <button
            className="text-button"
            type="button"
            disabled={busy}
            onClick={() => setInput({ ...example })}
          >
            Load example
          </button>
        </div>
        {busy && (
          <p className="generation-note" role="status">
            {hosted
              ? "Your brief is sent to Groq for AI generation. Please use sample information for this demo."
              : "Your brief stays on this machine. First generation can take a few minutes while the model loads."}
          </p>
        )}
      </form>
    </section>
  );
}
export function Preview() {
  return (
    <section className="panel preview-panel">
      <h2>A plan everyone can agree on.</h2>
      <p className="muted">
        We’ll turn your brief into a structured proposal with clear milestones,
        deliverables, and payment terms.
      </p>
      <div className="milestone-preview">
        {preview.map((m, i) => (
          <article key={m.title} className="preview-row">
            <span className="number">{i + 1}</span>
            <div>
              <div className="row-title">
                <h3>{m.title}</h3>
                <strong>{m.percent}%</strong>
              </div>
              <p>{m.description}</p>
              <div className="criteria">
                <span>Acceptance criteria</span>
                <p>{m.criteria[0]}</p>
              </div>
            </div>
          </article>
        ))}
      </div>
      <div className="promise">
        <ShieldCheck size={29} />
        <div>
          <strong>
            You review every scope. Your client approves every payment.
          </strong>
          <p>
            Example milestones above. Checkout creates a direct sandbox payment.
          </p>
        </div>
      </div>
    </section>
  );
}
export function ConnectionStrip({ status, onOpen }) {
  const ollamaReady = status?.ollama.ready,
    paypalReady = status?.paypal.configured;
  return (
    <section className="connection-strip" aria-label="Connection status">
      <div className="connection-intro">
        <strong>Connect your tools</strong>
        <p>
          {hosted
            ? "Groq drafts your scope. PayPal handles checkout."
            : "Your brief stays local. PayPal handles checkout."}
        </p>
      </div>
      <button className="connection" onClick={onOpen}>
        <Cpu size={30} />
        <div>
          <strong>{hosted ? "Groq" : "Ollama"}</strong>
          <span>{hosted ? "Cloud AI" : "Local AI"}</span>
          <small className={ollamaReady ? "ready" : ""}>
            <i />
            {status
              ? ollamaReady
                ? "Connected"
                : status.ollama.online
                  ? "Model required"
                  : "Setup required"
              : "Checking…"}
          </small>
        </div>
        <ChevronRight size={16} />
      </button>
      <button className="connection" onClick={onOpen}>
        <Wallet size={30} />
        <div>
          <strong>PayPal</strong>
          <span>Sandbox payments</span>
          <small className={paypalReady ? "ready" : ""}>
            <i />
            {status
              ? paypalReady
                ? "Credentials configured"
                : "Setup required"
              : "Checking…"}
          </small>
        </div>
        <ChevronRight size={16} />
      </button>
      <button className="button primary" onClick={onOpen}>
        Configure connections
      </button>
    </section>
  );
}
