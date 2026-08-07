# Timeliner Features

Timeliner is a browser-based project management tool built for project managers who need to manage multiple local projects from a folder-backed workspace. It stores workspace data as JSON files on the user's machine and uses the File System Access API for persistence.

## Workspace Management

- **Create or open a workspace** — Scaffold a new local workspace folder or load an existing Timeliner workspace.
- **Folder-backed persistence** — Store workspace and project data as JSON files in a user-selected local directory.
- **Persistent folder handle** — Save the selected workspace handle in IndexedDB when supported, making future reopens faster.
- **Seed demo data** — Populate a new workspace with realistic sample projects, including Payments Launch, Mobile Revamp, and Infra Migration.
- **Export and import** — Export workspace data as JSON or import an existing JSON workspace.
- **Local-first storage** — Keep all data on the user's machine with no backend, authentication, or cloud sync.

## Project and Timeline Management

- **Side-by-side project tabs** — View one or two project panels at the same time for cross-project planning.
- **Vertical timeline layout** — Review project work on a timeline with a sticky Today marker.
- **Zoom controls** — Adjust the timeline scale to inspect short-term or long-term schedules.
- **Gantt chart view** — Visualize each project's tasks in a Gantt-style schedule.
- **Workload view** — Group tasks by assignee to support capacity planning and workload balancing.

## Task Management

- **Task cards** — Manage task information directly from timeline cards.
- **Inline editing** — Update task fields without leaving the timeline view.
- **Quick actions** — Quickly increase task progress by 10% or shift task dates by one day.
- **Task details modal** — Open a full task view with activity history, dependencies, and cross-project dependencies.
- **Bulk operations** — Select multiple tasks and update or delete them together.
- **Templates** — Save reusable task templates and apply them when creating new work.
- **Undo and redo** — Revert or restore task operations using a capped undo/redo history.
- **Milestone assignment** — Assign tasks to milestones from the inline editor, with a visible milestone badge on each task card.

## Smart Task Input

- **Natural language task parsing** — Convert text such as `Build API today to tomorrow p2 @Alice #backend PROJ-123` into structured task fields.
- **Automatic field extraction** — Parse dates, priority, assignee, labels, and Jira ticket references from typed input.
- **Manual entry fallback** — Use a full form when natural language parsing is not enough.

## Search, Filtering, and Intelligence

- **Global search** — Search across task title, assignee, Jira links, labels, deliverables, and computed status.
- **Timeline filters** — Filter timelines by status, priority, and assignee.
- **Project Intelligence Summary** — View an AI-style dashboard with health score, highlights, lowlights, risks, and milestone tracking.

## People and Accountability

- **Assignee tracking** — Track assignee history and show handoff indicators when ownership changes.
- **Accountability fields** — Record the accountable person for each task.
- **Team management** — Manage workspace people and their roles.

## User Experience and Accessibility

- **Skeleton loading states** — Display smooth placeholders while data is loading.
- **Contextual empty states** — Show helpful empty states for no tasks, no search results, and all-done views.
- **Toast notifications** — Provide feedback for save, create, delete, undo, and redo actions.
- **Error boundary** — Recover gracefully from unexpected UI errors.
- **Keyboard navigation** — Support Enter and Space interactions on task cards with focus management.
- **ARIA support** — Use accessibility labels and roles throughout the interface.

## Reliability and Testing

- **Schema validation** — Validate workspace JSON with zod before hydrating the UI.
- **Autosave and manual save** — Save changes with debounced autosave while still offering a manual save action.
- **Unit and component tests** — Cover store actions, utility functions, and key UI components such as TaskCard, Modal, EmptyState, and ErrorBoundary.

## Browser Requirements

- **Chromium browser support** — Use Chrome, Edge, Arc, or another Chromium-based browser for File System Access API support.
- **Helpful unsupported-browser messaging** — Show a clear requirement message when the File System Access API is unavailable.

## Planned Production Features

Timeliner now includes a **Production roadmap** panel in the workspace menu that tracks the next 20 production-polish capabilities:

1. Project health rules engine
2. Dependency graph view
3. Critical path detection
4. ✅ Milestones and releases — Tasks can now be assigned to milestones via the inline editor, with milestone badges visible on task cards.
5. Roadmap view
6. Baselines and schedule variance
7. Version history and change audit
8. Conflict detection and resolution
9. Advanced recurring tasks
10. Calendar view and calendar export
11. Kanban board view
12. Saved views
13. Custom fields
14. Tags and label management improvements
15. Rich task descriptions and attachments
16. Comments and activity threads
17. Notifications and reminders
18. Importers for common tools
19. Report builder and exportable dashboards
20. Workspace backup, restore, and integrity check
