import { useRef } from "react";
import { Download, Upload } from "lucide-react";
import { Modal } from "../../components/ui/Modal";
import { Button } from "../../components/ui/Button";

type ExportImportModalProps = {
  open: boolean;
  onClose: () => void;
  onExport: () => void;
  onImport: (file: File) => Promise<void>;
};

export const ExportImportModal = ({
  open,
  onClose,
  onExport,
  onImport,
}: ExportImportModalProps) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Export / Import workspace"
      description="Backup your workspace as a single JSON file or restore from one."
    >
      <div className="grid gap-6 lg:grid-cols-2">
        <section className="space-y-3 rounded-2xl border border-white/10 bg-white/4 p-4">
          <h3 className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-300">
            Export
          </h3>
          <p className="text-sm text-slate-400">
            Download the entire workspace — all projects, tasks, people, and
            labels — as a single JSON file.
          </p>
          <Button onClick={onExport} className="w-full">
            <Download className="size-4" />
            Export workspace
          </Button>
        </section>
        <section className="space-y-3 rounded-2xl border border-white/10 bg-white/4 p-4">
          <h3 className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-300">
            Import
          </h3>
          <p className="text-sm text-slate-400">
            Restore a workspace from a previously exported JSON file. This will
            replace your current workspace data.
          </p>
          <input
            ref={fileInputRef}
            type="file"
            accept=".json"
            className="hidden"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) {
                onImport(file);
                onClose();
              }
            }}
          />
          <Button
            onClick={() => fileInputRef.current?.click()}
            className="w-full"
          >
            <Upload className="size-4" />
            Import workspace
          </Button>
        </section>
      </div>
    </Modal>
  );
};
