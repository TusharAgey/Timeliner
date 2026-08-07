import FolderOpen from "lucide-react/dist/esm/icons/folder-open";
import HardDriveDownload from "lucide-react/dist/esm/icons/hard-drive-download";
import { Button } from "../../components/ui/Button";

type WorkspaceLauncherProps = {
  onCreate: () => Promise<void>;
  onOpen: () => Promise<void>;
  disabled?: boolean;
  fsSupported: boolean;
  error: string | null;
};

export const WorkspaceLauncher = ({
  onCreate,
  onOpen,
  disabled,
  fsSupported,
  error,
}: WorkspaceLauncherProps) => (
  <main className="mx-auto flex min-h-screen max-w-5xl flex-col justify-center px-6 py-16">
    <div className="glass overflow-hidden rounded-[32px] border border-white/10">
      <div className="grid gap-0 lg:grid-cols-[1.2fr_0.8fr]">
        <section className="border-b border-white/10 p-8 lg:border-b-0 lg:border-r lg:p-12">
          <div className="inline-flex rounded-full border border-violet-400/20 bg-violet-500/10 px-3 py-1 text-xs font-medium uppercase tracking-[0.24em] text-violet-200">
            Timeliner MVP
          </div>
          <h1 className="mt-6 max-w-xl text-4xl font-semibold tracking-tight text-white lg:text-5xl">
            Plan multi-project delivery in a workspace that stays on your
            machine.
          </h1>
          <p className="mt-4 max-w-2xl text-base text-slate-300 lg:text-lg">
            A fast PM timeline planner with side-by-side project views, local
            folder persistence, autosave, project summaries, and structured task
            editing.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Button
              onClick={onCreate}
              disabled={disabled || !fsSupported}
              className="min-w-44"
            >
              <HardDriveDownload className="size-4" /> Create Workspace
            </Button>
            <Button
              variant="secondary"
              onClick={onOpen}
              disabled={disabled || !fsSupported}
              className="min-w-44"
            >
              <FolderOpen className="size-4" /> Open Existing Workspace
            </Button>
          </div>
          {error ? <p className="mt-4 text-sm text-rose-300">{error}</p> : null}
          {!fsSupported ? (
            <div className="mt-6 rounded-2xl border border-amber-400/20 bg-amber-500/10 p-4 text-sm text-amber-100">
              File System Access API is unavailable. Please use a Chromium-based
              browser like Chrome, Edge, or Arc.
            </div>
          ) : null}
        </section>
        <aside className="bg-white/3 p-8 lg:p-12">
          <h2 className="text-lg font-semibold text-white">
            Workspace structure
          </h2>
          <pre className="mt-4 overflow-x-auto rounded-2xl border border-white/10 bg-slate-950/40 p-4 text-sm text-slate-300">
            {`/timeliner-workspace
  workspace.json
  /projects
    payments.json
    mobile.json
  /lookups
    people.json
    labels.json`}
          </pre>
          <ul className="mt-6 space-y-3 text-sm text-slate-300">
            <li>
              • All project data persisted as JSON in your selected folder.
            </li>
            <li>• Folder handle is cached locally for quick reopen.</li>
            <li>• Autosave keeps changes durable without a backend.</li>
          </ul>
        </aside>
      </div>
    </div>
  </main>
);
