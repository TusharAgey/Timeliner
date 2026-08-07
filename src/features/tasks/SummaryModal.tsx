import { useMemo } from "react";
import Activity from "lucide-react/dist/esm/icons/activity";
import AlertTriangle from "lucide-react/dist/esm/icons/alert-triangle";
import CheckCircle2 from "lucide-react/dist/esm/icons/check-circle-2";
import Flag from "lucide-react/dist/esm/icons/flag";
import TrendingUp from "lucide-react/dist/esm/icons/trending-up";

import { Modal } from "../../components/ui/Modal";
import { computeProjectIntelligenceSummary } from "../../lib/summary";
import type { MilestoneInsight } from "../../lib/summary";
import type { Project } from "../../models/types";

type SummaryModalProps = {
  open: boolean;
  projects: Project[];
  onClose: () => void;
};

const healthTone = {
  green: "bg-emerald-400 shadow-[0_0_18px_rgba(52,211,153,0.36)]",
  yellow: "bg-amber-300 shadow-[0_0_18px_rgba(252,211,77,0.32)]",
  red: "bg-rose-400 shadow-[0_0_18px_rgba(251,113,133,0.34)]",
};

const statusTone: Record<MilestoneInsight["status"], string> = {
  "On track": "border-emerald-300/20 bg-emerald-400/10 text-emerald-200",
  "At risk": "border-amber-300/20 bg-amber-400/10 text-amber-200",
  Delayed: "border-rose-300/20 bg-rose-400/10 text-rose-200",
};

const insightSections = [
  {
    key: "highlights",
    title: "Highlights",
    subtitle: "What’s going well",
    icon: CheckCircle2,
    tone: "text-emerald-200 bg-emerald-400/10 ring-emerald-300/15",
  },
  {
    key: "lowlights",
    title: "Lowlights",
    subtitle: "What needs attention",
    icon: AlertTriangle,
    tone: "text-rose-200 bg-rose-400/10 ring-rose-300/15",
  },
  {
    key: "risks",
    title: "Risks",
    subtitle: "Forward-looking issues",
    icon: Activity,
    tone: "text-amber-200 bg-amber-400/10 ring-amber-300/15",
  },
] as const;

export const SummaryModal = ({
  open,
  projects,
  onClose,
}: SummaryModalProps) => {
  const summary = useMemo(
    () => (open ? computeProjectIntelligenceSummary(projects) : null),
    [open, projects],
  );

  if (!summary) {
    return <Modal open={open} onClose={onClose} title="Project intelligence" />;
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Project intelligence"
      description="Executive signals across the projects visible in the active tab."
    >
      <div className="space-y-6">
        <div className="grid gap-4 lg:grid-cols-2">
          {insightSections.map((section) => {
            const Icon = section.icon;
            const bullets = summary[section.key];
            return (
              <section
                key={section.key}
                className="rounded-[24px] bg-white/[0.035] p-5 ring-1 ring-white/8"
              >
                <div className="flex items-start gap-3">
                  <div className={`rounded-2xl p-2 ring-1 ${section.tone}`}>
                    <Icon className="size-4" />
                  </div>
                  <div>
                    <h3 className="font-semibold tracking-tight text-white">
                      {section.title}
                    </h3>
                    <p className="text-xs uppercase tracking-[0.18em] text-slate-500">
                      {section.subtitle}
                    </p>
                  </div>
                </div>
                <ul className="mt-4 space-y-3 text-sm leading-6 text-slate-300">
                  {bullets.map((item) => (
                    <li key={item} className="flex gap-3">
                      <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-slate-500" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </section>
            );
          })}

          <section className="rounded-[24px] bg-white/[0.035] p-5 ring-1 ring-white/8">
            <div className="flex items-start gap-3">
              <div className="rounded-2xl bg-cyan-400/10 p-2 text-cyan-200 ring-1 ring-cyan-300/15">
                <Flag className="size-4" />
              </div>
              <div>
                <h3 className="font-semibold tracking-tight text-white">
                  Milestones
                </h3>
                <p className="text-xs uppercase tracking-[0.18em] text-slate-500">
                  Upcoming by date
                </p>
              </div>
            </div>
            <div className="mt-4 space-y-3">
              {summary.milestones.length ? (
                summary.milestones.map((milestone) => (
                  <div
                    key={`${milestone.projectName}-${milestone.id}`}
                    className="flex items-center justify-between gap-3 rounded-2xl bg-black/18 px-3 py-2 ring-1 ring-white/6"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-slate-100">
                        {milestone.title}
                      </p>
                      <p className="mt-0.5 text-xs text-slate-500">
                        {milestone.projectName} — {milestone.label}
                      </p>
                    </div>
                    <span
                      className={`shrink-0 rounded-full border px-2.5 py-1 text-[11px] font-medium ${statusTone[milestone.status]}`}
                    >
                      {milestone.status}
                    </span>
                  </div>
                ))
              ) : (
                <p className="rounded-2xl bg-black/18 px-3 py-3 text-sm text-slate-400 ring-1 ring-white/6">
                  No upcoming milestones in the visible projects.
                </p>
              )}
            </div>
          </section>
        </div>

        <section className="rounded-[24px] bg-white/[0.035] p-5 ring-1 ring-white/8">
          <div className="flex items-start gap-3">
            <div className="rounded-2xl bg-violet-400/10 p-2 text-violet-200 ring-1 ring-violet-300/15">
              <TrendingUp className="size-4" />
            </div>
            <div>
              <h3 className="font-semibold tracking-tight text-white">
                Project health heatmap
              </h3>
              <p className="text-xs uppercase tracking-[0.18em] text-slate-500">
                80–100 green · 50–79 yellow · 0–49 red
              </p>
            </div>
          </div>
          <div className="mt-4 divide-y divide-white/6 overflow-hidden rounded-2xl bg-black/18 ring-1 ring-white/6">
            {summary.health.map((project) => (
              <div
                key={project.projectId}
                className="grid gap-3 px-4 py-3 sm:grid-cols-[minmax(0,1fr)_220px] sm:items-center"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-slate-100">
                    {project.projectName}
                  </p>
                  <p className="mt-0.5 text-xs text-slate-500">
                    {project.reasons.length
                      ? project.reasons.join(" · ")
                      : "No major health deductions"}
                  </p>
                </div>
                <div className="flex items-center gap-3 sm:justify-end">
                  <div className="h-2 w-28 overflow-hidden rounded-full bg-white/8">
                    <div
                      className={`h-full rounded-full ${healthTone[project.tone]}`}
                      style={{ width: `${project.score}%` }}
                    />
                  </div>
                  <span className="w-20 text-right text-sm font-semibold text-white">
                    {project.score}
                  </span>
                  <span
                    className={`size-3 rounded-full ${healthTone[project.tone]}`}
                  />
                  <span className="w-16 text-xs text-slate-400">
                    {project.label}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </Modal>
  );
};
