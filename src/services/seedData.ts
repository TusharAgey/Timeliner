import { addDays, subDays } from "date-fns";
import type {
  Label,
  Person,
  Project,
  Workspace,
  WorkspaceData,
  WorkspaceTab,
} from "../models/types";
import { iso } from "../lib/date";
import { uid } from "../lib/utils";
import { makeAccountableHistory, makeAssigneeHistory } from "../lib/assignees";

const people: Person[] = [
  { id: uid("person"), name: "Ravi Patel", role: "Engineering Manager" },
  { id: uid("person"), name: "Nina Chen", role: "Staff Designer" },
  { id: uid("person"), name: "Marcus Bell", role: "Tech Lead" },
  { id: uid("person"), name: "Leah Gomez", role: "Product Analyst" },
  { id: uid("person"), name: "Ava Singh", role: "Program Manager" },
];

const labels: Label[] = [
  { id: uid("label"), name: "Launch", color: "#8b5cf6" },
  { id: uid("label"), name: "Backend", color: "#06b6d4" },
  { id: uid("label"), name: "Mobile", color: "#22c55e" },
  { id: uid("label"), name: "Risk", color: "#f59e0b" },
  { id: uid("label"), name: "Infra", color: "#ef4444" },
];

const makeTask = (
  task: Partial<Project["tasks"][number]> &
    Pick<Project["tasks"][number], "title">,
) => ({
  id: uid("task"),
  description: "",
  assignees: makeAssigneeHistory("Unassigned", iso(new Date())),
  accountable: makeAccountableHistory("Unassigned", iso(new Date())),
  jiraLink: "",
  deliverable: "",
  startDate: iso(new Date()),
  endDate: iso(addDays(new Date(), 7)),
  expectedStartDate: iso(new Date()),
  expectedEndDate: iso(addDays(new Date(), 7)),
  progressPercent: 0,
  priority: "Medium" as const,
  labels: [],
  blockedReason: "",
  dependencies: [],
  crossProjectDependencies: [],
  activityLog: [],
  isTemplate: false,
  ...task,
});

const projects: Project[] = [
  {
    id: uid("project"),
    slug: "payments",
    name: "Payments Launch",
    description:
      "Coordinate payment rails, checkout readiness, and go-live risk tracking.",
    milestones: [
      {
        id: uid("milestone"),
        title: "Sandbox UAT complete",
        date: iso(addDays(new Date(), 6)),
        description: "Merchant acceptance criteria signed off.",
      },
      {
        id: uid("milestone"),
        title: "Launch review",
        date: iso(addDays(new Date(), 20)),
        description: "Readiness with support and finance.",
      },
    ],
    tasks: [
      makeTask({
        title: "Finalize API migration",
        assignees: makeAssigneeHistory(
          "Ravi Patel",
          iso(subDays(new Date(), 5)),
        ),
        jiraLink: "https://jira.local/browse/ENG-123",
        deliverable: "Gateway v2 production cutover",
        startDate: iso(subDays(new Date(), 5)),
        endDate: iso(addDays(new Date(), 4)),
        expectedStartDate: iso(subDays(new Date(), 6)),
        expectedEndDate: iso(addDays(new Date(), 3)),
        progressPercent: 62,
        priority: "Critical",
        labels: ["Launch", "Backend"],
        description: "Own API migration sequencing and partner comms.",
      }),
      makeTask({
        title: "Resolve refund edge cases",
        assignees: makeAssigneeHistory(
          "Marcus Bell",
          iso(subDays(new Date(), 8)),
        ),
        jiraLink: "https://jira.local/browse/PAY-88",
        deliverable: "Refund scenarios test matrix",
        startDate: iso(subDays(new Date(), 8)),
        endDate: iso(subDays(new Date(), 1)),
        expectedStartDate: iso(subDays(new Date(), 8)),
        expectedEndDate: iso(subDays(new Date(), 2)),
        progressPercent: 55,
        priority: "High",
        labels: ["Risk"],
        blockedReason: "Awaiting legal approval for international refund flow.",
        description: "Pending legal sign-off on regional exceptions.",
      }),
      makeTask({
        title: "Finance launch packet",
        assignees: makeAssigneeHistory(
          "Leah Gomez",
          iso(addDays(new Date(), 2)),
        ),
        deliverable: "Settlement and reporting FAQ",
        startDate: iso(addDays(new Date(), 2)),
        endDate: iso(addDays(new Date(), 11)),
        expectedStartDate: iso(addDays(new Date(), 2)),
        expectedEndDate: iso(addDays(new Date(), 10)),
        progressPercent: 5,
        priority: "Medium",
        labels: ["Launch"],
      }),
    ],
  },
  {
    id: uid("project"),
    slug: "mobile",
    name: "Mobile Revamp",
    description:
      "Rebuild onboarding and mobile IA ahead of summer growth campaigns.",
    milestones: [
      {
        id: uid("milestone"),
        title: "Design freeze",
        date: iso(addDays(new Date(), 4)),
        description: "Scope locked for sprint 12.",
      },
      {
        id: uid("milestone"),
        title: "Beta release",
        date: iso(addDays(new Date(), 18)),
        description: "Dogfood via employee beta cohort.",
      },
    ],
    tasks: [
      makeTask({
        title: "Prototype new onboarding",
        assignees: makeAssigneeHistory(
          "Nina Chen",
          iso(subDays(new Date(), 2)),
        ),
        jiraLink: "https://jira.local/browse/MOB-204",
        deliverable: "Clickable Figma prototype",
        startDate: iso(subDays(new Date(), 2)),
        endDate: iso(addDays(new Date(), 5)),
        expectedStartDate: iso(subDays(new Date(), 2)),
        expectedEndDate: iso(addDays(new Date(), 5)),
        progressPercent: 80,
        priority: "High",
        labels: ["Mobile"],
        description: "Polish interaction states and handoff notes.",
      }),
      makeTask({
        title: "Analytics event remap",
        assignees: makeAssigneeHistory(
          "Ava Singh",
          iso(addDays(new Date(), 1)),
        ),
        jiraLink: "https://jira.local/browse/DATA-52",
        deliverable: "Measurement plan for funnel screens",
        startDate: iso(addDays(new Date(), 1)),
        endDate: iso(addDays(new Date(), 9)),
        expectedStartDate: iso(addDays(new Date(), 1)),
        expectedEndDate: iso(addDays(new Date(), 8)),
        progressPercent: 0,
        priority: "Medium",
        labels: ["Mobile"],
      }),
      makeTask({
        title: "Retire legacy nav",
        assignees: makeAssigneeHistory(
          "Marcus Bell",
          iso(subDays(new Date(), 14)),
        ),
        deliverable: "Navigation cleanup PR",
        startDate: iso(subDays(new Date(), 14)),
        endDate: iso(subDays(new Date(), 3)),
        expectedStartDate: iso(subDays(new Date(), 14)),
        expectedEndDate: iso(subDays(new Date(), 4)),
        progressPercent: 100,
        priority: "Low",
        labels: ["Mobile"],
      }),
    ],
  },
  {
    id: uid("project"),
    slug: "infra",
    name: "Infra Migration",
    description:
      "Move core services to the new platform with dependency tracking across teams.",
    milestones: [
      {
        id: uid("milestone"),
        title: "Staging cutover",
        date: iso(addDays(new Date(), 10)),
        description: "Traffic shadowing enabled.",
      },
      {
        id: uid("milestone"),
        title: "Production migration",
        date: iso(addDays(new Date(), 28)),
        description: "Progressive regional rollout.",
      },
    ],
    tasks: [
      makeTask({
        title: "Backfill runbooks",
        assignees: makeAssigneeHistory(
          "Ravi Patel",
          iso(subDays(new Date(), 4)),
        ),
        deliverable: "Operational runbooks by domain",
        startDate: iso(subDays(new Date(), 4)),
        endDate: iso(addDays(new Date(), 7)),
        expectedStartDate: iso(subDays(new Date(), 4)),
        expectedEndDate: iso(addDays(new Date(), 6)),
        progressPercent: 28,
        priority: "High",
        labels: ["Infra"],
        description: "Coordinate incident flows and rollback paths.",
      }),
      makeTask({
        title: "Database replication dry run",
        assignees: makeAssigneeHistory(
          "Marcus Bell",
          iso(addDays(new Date(), 3)),
        ),
        jiraLink: "https://jira.local/browse/OPS-312",
        deliverable: "Dry-run report",
        startDate: iso(addDays(new Date(), 3)),
        endDate: iso(addDays(new Date(), 14)),
        expectedStartDate: iso(addDays(new Date(), 3)),
        expectedEndDate: iso(addDays(new Date(), 13)),
        progressPercent: 0,
        priority: "Critical",
        labels: ["Infra", "Backend"],
      }),
      makeTask({
        title: "Vendor firewall approval",
        assignees: makeAssigneeHistory(
          "Leah Gomez",
          iso(subDays(new Date(), 12)),
        ),
        deliverable: "Approved firewall whitelist",
        startDate: iso(subDays(new Date(), 12)),
        endDate: iso(subDays(new Date(), 2)),
        expectedStartDate: iso(subDays(new Date(), 12)),
        expectedEndDate: iso(subDays(new Date(), 4)),
        progressPercent: 40,
        priority: "High",
        labels: ["Infra", "Risk"],
        blockedReason: "Security team waiting on vendor IP ranges.",
      }),
    ],
  },
];

const tabs: WorkspaceTab[] = [
  {
    id: uid("tab"),
    name: "Launch Ops",
    projectIds: [projects[0].id, projects[2].id],
  },
  { id: uid("tab"), name: "Product Focus", projectIds: [projects[1].id] },
];

const workspace: Workspace = {
  id: uid("workspace"),
  name: "Timeliner Demo Workspace",
  projectIds: projects.map((project) => project.id),
  tabs,
};

export const createSeedWorkspace = (): WorkspaceData => ({
  workspace,
  projects,
  people,
  labels,
});
