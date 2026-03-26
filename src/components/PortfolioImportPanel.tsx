import { useState } from "react";
import { MaterialIcon } from "./MaterialIcon";
import { Panel } from "./ui";

type UploadResult = {
  accepted: boolean;
  files_processed: number;
  filenames: string[];
  holdings_detected: number;
  symbols: string[];
  persistence_path: string;
  notes: string[];
};

type BrokerOption = {
  name: string;
  tag: string;
  icon: string;
  color: string;
};

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL ?? "http://127.0.0.1:8000/api/v1";

export const futureBrokerOptions: BrokerOption[] = [
  { name: "Zerodha", tag: "Future Kite API", icon: "rocket_launch", color: "#387ed1" },
  { name: "Upstox", tag: "Future Direct Link", icon: "account_balance", color: "#673ab7" },
  { name: "Groww", tag: "Future Fast Connect", icon: "trending_up", color: "#00d09c" },
];

export function FutureIntegrationsPanel(props: { title?: string; description?: string }) {
  return (
    <Panel className="p-8">
      <div className="mb-6">
        <h3 className="text-xl font-bold text-white">{props.title ?? "Future Broker Integrations"}</h3>
        <p className="mt-2 text-sm text-on-surface-variant">
          {props.description ?? "These broker connectors are shown as the next step after CSV import so you can demo the planned integration roadmap."}
        </p>
      </div>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {futureBrokerOptions.map((broker) => (
          <div key={broker.name} className="rounded-[1.5rem] border border-white/5 bg-surface-container-high p-6 text-center">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-xl" style={{ backgroundColor: `${broker.color}1a` }}>
              <MaterialIcon name={broker.icon} className="text-3xl" fill />
            </div>
            <div className="font-bold text-white">{broker.name}</div>
            <div className="mt-1 text-[10px] uppercase tracking-[0.18em] text-on-surface-variant">{broker.tag}</div>
          </div>
        ))}
      </div>
    </Panel>
  );
}

export function PortfolioUploadPanel(props: { title: string; description: string }) {
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<UploadResult | null>(null);

  async function handleUpload() {
    if (selectedFiles.length === 0) {
      setError("Select at least one CSV file to upload.");
      return;
    }

    setSubmitting(true);
    setError(null);
    setResult(null);

    const formData = new FormData();
    for (const file of selectedFiles) {
      formData.append("files", file);
    }

    try {
      const response = await fetch(`${apiBaseUrl}/connect/uploads/batch`, {
        method: "POST",
        body: formData,
      });

      const payload = await response.json();
      if (!response.ok) {
        setError(payload.detail ?? "Upload failed.");
        setSubmitting(false);
        return;
      }

      setResult(payload as UploadResult);
      setSelectedFiles([]);
      const refreshedAt = new Date().toISOString();
      window.localStorage.setItem("nirvesta:last-portfolio-upload-at", refreshedAt);
      window.dispatchEvent(new CustomEvent("nirvesta:portfolio-uploaded", { detail: { refreshedAt } }));
    } catch {
      setError("Could not reach the backend. Make sure the FastAPI server is running on the configured API base URL.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Panel className="border-white/5 bg-surface-container-low p-6">
      <div className="mb-5 flex items-start gap-4">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/10 bg-white/5">
          <MaterialIcon name="upload_file" className="text-2xl text-white" />
        </div>
        <div>
          <h3 className="text-xl font-bold text-white">{props.title}</h3>
          <p className="mt-2 max-w-2xl text-sm text-on-surface-variant">{props.description}</p>
        </div>
      </div>

      <label className="flex cursor-pointer flex-col items-center justify-center rounded-[1.5rem] border-2 border-dashed border-white/10 bg-surface-container-lowest px-6 py-10 text-center transition hover:border-tertiary/40">
        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-white/5">
          <MaterialIcon name="file_open" className="text-3xl text-white" />
        </div>
        <div className="text-lg font-bold text-white">Choose CSV files</div>
        <div className="mt-2 text-sm text-on-surface-variant">Supports one or many `.csv` files. Holdings are merged by symbol before persistence.</div>
        <div className="mt-4 flex flex-wrap justify-center gap-2">
          {[".CSV", "MULTI-FILE", "MERGED HOLDINGS"].map((tag) => (
            <span key={tag} className="rounded-lg bg-white/5 px-3 py-1 text-[10px] font-mono text-neutral-400">
              {tag}
            </span>
          ))}
        </div>
        <input
          type="file"
          accept=".csv,text/csv"
          multiple
          className="hidden"
          onChange={(event) => setSelectedFiles(Array.from(event.target.files ?? []))}
        />
      </label>

      {selectedFiles.length > 0 ? (
        <div className="mt-5 rounded-2xl border border-white/10 bg-white/5 p-4">
          <div className="mb-3 text-[10px] font-bold uppercase tracking-[0.18em] text-neutral-500">Ready to upload</div>
          <div className="flex flex-wrap gap-2">
            {selectedFiles.map((file) => (
              <span key={`${file.name}-${file.size}`} className="rounded-full border border-white/10 px-3 py-2 text-xs text-white">
                {file.name}
              </span>
            ))}
          </div>
        </div>
      ) : null}

      {error ? <div className="mt-5 rounded-2xl border border-error/20 bg-error/10 px-4 py-3 text-sm text-error">{error}</div> : null}

      {result ? (
        <div className="mt-5 rounded-2xl border border-tertiary/20 bg-tertiary/10 p-4">
          <div className="text-sm font-semibold text-tertiary">
            Uploaded {result.files_processed} file{result.files_processed === 1 ? "" : "s"} and detected {result.holdings_detected} holdings.
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            {result.symbols.map((symbol) => (
              <span key={symbol} className="rounded-full bg-black/20 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-white">
                {symbol}
              </span>
            ))}
          </div>
          <p className="mt-3 text-xs text-on-surface-variant">Persisted to: {result.persistence_path}</p>
        </div>
      ) : null}

      <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="text-xs text-on-surface-variant">
          Sample file available at <span className="font-mono text-white">backend/data/mock_portfolio_upload.csv</span>
        </div>
        <button
          type="button"
          onClick={() => void handleUpload()}
          disabled={submitting || selectedFiles.length === 0}
          className="rounded-2xl bg-white px-5 py-3 text-sm font-bold text-on-primary transition hover:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {submitting ? "Uploading..." : selectedFiles.length > 1 ? "Upload Selected CSVs" : "Upload CSV"}
        </button>
      </div>
    </Panel>
  );
}
