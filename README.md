# MAT.AI OS UI

Desktop UI for **MAT-AI-OS** — a personal AI operating system. Built with React, Vite, and Electron.

> One Brain. Infinite Skills. Autonomous Loops.

## Features

A "🧠 Brain / 🎬 Creator" toggle in the header swaps the whole `app-body` between two
workspaces — no router, just local state in `App.tsx`; both share the same three-column
`.app-body` grid layout.

### 🧠 Brain (default)

- **Brain View** — a live, physics-animated graph of domains and skills orbiting a central core node.
- **Skills Library** — domain cards (Trading, Coding, Research, Business, Personal, Legal, Creative, AI/Automation, Data & Analytics, Web3/Blockchain) listing top skills per domain — count varies as `/learn` adds more over time (145 at last count; see `GET /health` for the live number).
- **Core Engine** — status of the Memory, Skills, Agents, Loops, and Actions layers.
- **Active Loops / Agent Operations** — live status of running automation loops and agents.
- **Memory System** — Hot, Warm, Cold, and Archive memory tiers.
- **Chat panel** — orchestrator chat with Chat / Voice / Vision / Desktop interface modes.

### 🎬 Creator Workspace

MVP project-based content generation, built on the backend's existing Capability
Registry — no new providers.

- **Projects sidebar** (left) — project list with status badges (draft/in_progress/ready/published) + a New Project form (`POST /creator/projects`).
- **Canvas** (center) — five fixed cards per project: Script, Thumbnail/Image, Voice, Video, Music. Each renders per output state — not requested, queued, pending (async job), completed (inline preview via the existing `GET /capabilities/output/{job_id}` — no new file-serving route), or failed with the real error message.
- **Action panel** (right) — goal input + output checkboxes + Run Project button (`POST /creator/projects/{id}/run`), plus a reverse-chronological activity feed.
- Own WebSocket connection (`CreatorContext`, reusing the same `useSocket` hook `BackendContext` uses) applies `creator_project_updated`/`creator_output_ready` events live, with a 5s poll on the open project as a fallback.

## Tech stack

- React 18 + TypeScript
- Vite (dev server on port `7777`)
- Electron (desktop shell)

## Getting started

```bash
npm install
npm run dev            # run the Vite dev server only
npm run electron:dev   # run Vite + Electron together
```

The UI expects a MAT-AI-OS backend at `http://localhost:8000` (see [src/config.ts](src/config.ts) for the API/WebSocket URLs).

## Build

```bash
npm run build   # type-check, build the renderer, and package the Electron app
```

Packaged output is written to `release/`.

## Project structure

```
src/
  components/   UI components (BrainView, SkillsLibrary, LeftPanel, RightPanel, ChatPanel, ...)
  components/creator/  Creator Workspace: CreatorProjectsSidebar, CreatorCanvas, CreatorActionPanel, Creator.css
  data/         Domain and skill data
  hooks/        Float physics, socket hooks (useSocket is a reusable primitive — both
                BackendContext and CreatorContext open their own connection with it)
  context/      BackendContext — health/agents polling + WebSocket state
                CreatorContext — creator projects list/detail + its own WebSocket connection
  styles/       Global theme and layout
electron/       Electron main + preload scripts
```
