import { hosted } from "../hosting.js";
import { useEffect, useRef } from "react";
import { X, Cpu, Wallet, RefreshCw, ExternalLink } from "lucide-react";

export default function Connections({
  status,
  onClose,
  onRefresh,
  refreshing,
}) {
  const dialog = useRef(null);
  useEffect(() => {
    dialog.current.showModal();
  }, []);
  const model = status?.ollama.model || (hosted ? "openai/gpt-oss-20b" : "qwen2.5:0.5b");
  return (
    <dialog
      ref={dialog}
      className="connections-dialog"
      onCancel={onClose}
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          const r = e.currentTarget.getBoundingClientRect();
          if (
            e.clientX < r.left ||
            e.clientX > r.right ||
            e.clientY < r.top ||
            e.clientY > r.bottom
          )
            onClose();
        }
      }}
    >
      <div className="dialog-heading">
        <div>
          <h2>Connect your tools</h2>
          <p className="muted">
            {hosted
              ? "Cloud AI. Sandbox payments. Your workspace."
              : "Local AI. Sandbox payments. Your workspace."}
          </p>
        </div>
        <button
          className="icon-button"
          aria-label="Close connections"
          onClick={onClose}
        >
          <X size={22} />
        </button>
      </div>
      <section className="connection-detail">
        <div className="section-header">
          <h3>
            <Cpu size={22} />
            {hosted ? "Groq" : "Ollama"}
          </h3>
          <span
            className={`status-label ${status?.ollama.ready ? "connected" : ""}`}
          >
            {status?.ollama.ready
              ? "Connected"
              : status?.ollama.online
                ? "Model required"
                : hosted ? "Setup required" : "Not running"}
          </span>
        </div>
        {!hosted && (
          <>
            <p>
              Your brief is processed locally with <strong>{model}</strong>. No
              AI API key or paid subscription.
            </p>
            <ol>
              <li>Install Ollama for your operating system.</li>
              <li>
                Download the model: <code>ollama pull {model}</code>
              </li>
              <li>
                Keep Ollama running. If needed, run <code>ollama serve</code>.
              </li>
            </ol>
            <a
              href="https://ollama.com/download"
              target="_blank"
              rel="noreferrer"
            >
              Download Ollama
              <ExternalLink size={14} />
            </a>
          </>
        )}
        {hosted && (
          <p>
            Your brief is sent to Groq using {model}. AI drafts must be
            reviewed. The site owner configures the API key; visitors never need
            one.
          </p>
        )}
      </section>
      <section className="connection-detail">
        <div className="section-header">
          <h3>
            <Wallet size={22} />
            PayPal sandbox
          </h3>
          <span
            className={`status-label ${status?.paypal.configured ? "connected" : ""}`}
          >
            {status?.paypal.configured
              ? "Credentials configured"
              : "Setup required"}
          </span>
        </div>
        <p>
          Use a sandbox app and sandbox buyer. Credentials remain on the server.
        </p>
        {!hosted && (
          <ol>
            <li>Create a sandbox app in the PayPal Developer Dashboard.</li>
            <li>
              Copy <code>.env.example</code> to <code>.env.local</code> and add{" "}
              <code>PAYPAL_CLIENT_ID</code> and{" "}
              <code>PAYPAL_CLIENT_SECRET</code>.
            </li>
            <li>
              Restart ScopePay, then refresh the connection status. Credential
              validity is checked when checkout starts.
            </li>
          </ol>
        )}
        {hosted && (
          <p>
            Use a PayPal sandbox buyer at checkout. No real money moves. The
            site owner configures sandbox credentials.
          </p>
        )}
        <a
          href="https://developer.paypal.com/dashboard/applications/sandbox"
          target="_blank"
          rel="noreferrer"
        >
          PayPal Developer Dashboard
          <ExternalLink size={14} />
        </a>
      </section>
      <div className="dialog-footer">
        <p className="muted">
          Payments are sandbox-only. This app never uses PayPal’s live API.
        </p>
        <button
          className="button primary"
          disabled={refreshing}
          onClick={onRefresh}
        >
          <RefreshCw size={16} className={refreshing ? "spin" : ""} />
          {refreshing ? "Checking…" : "Refresh status"}
        </button>
      </div>
    </dialog>
  );
}
