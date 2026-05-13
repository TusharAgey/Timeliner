# Timeliner

[🌐 Live Demo](https://tusharagey.github.io/Timeliner)

Timeliner is a React + TypeScript + Vite project management tool for PMs managing multiple projects in a local folder-backed workspace. It runs entirely in the browser, uses the File System Access API for persistence, and stores everything as JSON files in a user-selected workspace directory.

## Features

### Workspace Management

- **Create / Open workspace** — Scaffold or load a local folder-backed workspace
- **Seed demo data** — 3 realistic projects (Payments Launch, Mobile Revamp, Infra Migration) on first launch
- **Persistent folder handle** — Saved in IndexedDB for quick re-opening
- **Export / Import** — Export or import workspace as JSON

### Project & Task Management

- **Side-by-side project tabs** — View one or two project panels simultaneously
- **Vertical timeline layout** — With sticky Today marker and zoom controls
- **Gantt chart view** — Visual Gantt chart for each project
- **Workload view** — Tasks grouped by assignee for capacity planning
- **Task cards** — Inline editing, quick actions (+10% progress, +1d date shift), delete
- **Task details modal** — Full task view with activity log, dependencies, cross-project dependencies
- **Bulk operations** — Select multiple tasks for bulk update or delete
- **Templates** — Save and reuse task templates
- **Undo / Redo** — Full undo/redo stack (capped at 50 entries) for all task operations

### Smart Input

- **Natural language task parsing** — Type `Build API today to tomorrow p2 @Alice #backend PROJ-123` and it auto-parses dates, priority, assignee, labels, and Jira ticket references
- **Manual entry fallback** — Full form when natural language parsing isn't enough

### Search & Filtering

- **Global search** — Across title, assignee, Jira links, labels, deliverables, and computed status
- **Timeline filters** — Filter by status, priority, assignee
- **Project Intelligence Summary** — AI-style dashboard with health score, highlights, lowlights, risks, and milestone tracking

### People & Accountability

- **Assignee tracking** — Full history of assignee changes with handoff indicators
- **Accountability** — Track accountable person per task
- **Team management** — Manage people and roles

### UX & Accessibility

- **Skeleton loading states** — Smooth loading placeholders
- **Empty states** — Contextual empty states for no tasks, no search results, all done
- **Toast notifications** — Feedback for save, create, delete, undo/redo actions
- **Error boundary** — Graceful error recovery
- **Keyboard navigation** — Enter/Space on task cards, focus management
- **ARIA labels & roles** — Full accessibility support throughout

### Testing

- **165 unit & component tests** — Covering store actions, utility functions, and key components (TaskCard, Modal, EmptyState, ErrorBoundary)

## Tech Stack

- **React 19** — UI framework
- **TypeScript** — Type safety
- **Vite** — Build tool
- **Zustand** — State management
- **Tailwind CSS** — Styling
- **date-fns** — Date utilities
- **zod** — Schema validation
- **Vitest** — Testing framework
- **@testing-library/react** — Component testing
- **sonner** — Toast notifications

## Workspace Structure

```text
/timeliner-workspace
  workspace.json
  /projects
    payments.json
    mobile.json
    infra.json
  /lookups
    people.json
    labels.json
```

## Getting Started

### Requirements

- Node.js 18+
- A Chromium-based browser for File System Access API support

### Install

```bash
npm install
```

### Run in development

```bash
npm run dev
```

Open the local Vite URL in Chrome, Edge, Arc, or another Chromium browser.

### Build for production

```bash
npm run build
```

### Run tests

```bash
npm run test
```

### Lint

```bash
npm run lint
```

## How it works

On first launch, Timeliner shows:

- **Create Workspace** — Scaffolds the required folder structure and writes seed JSON files
- **Open Existing Workspace** — Validates stored JSON with zod schemas before hydrating the UI

The selected folder handle is persisted in IndexedDB when possible to speed up reopening the workspace in future sessions.

Data is stored only on the local machine. There is no backend, auth, or cloud sync. Autosave is debounced and a manual save button is also available from the header.

## Screenshots

![Landing Page Demo](src/assets/Landing_Page_Demo.png)
_Landing page with workspace creation and open options_

![Project Intelligence Summary](src/assets/Project_Intelligence_Summary.png)
_Project summary modal with live metrics and timeline view_

## Notes

- If the File System Access API is unavailable, the app shows a helpful Chromium-browser requirement message.
- Data is stored only on the local machine. There is no backend, auth, or cloud sync.
- Autosave is debounced and manual save is also available from the header.

---

> **Vibe Coded** — This application was fully vibe coded using ChatGPT Codex and Deepseek.
