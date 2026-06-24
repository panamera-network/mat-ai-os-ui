# MAT.AI OS UI

Desktop UI for **MAT-AI-OS** — a personal AI operating system. Built with React, Vite, and Electron.

> One Brain. Infinite Skills. Autonomous Loops.

## Features

- **Brain View** — a live, physics-animated graph of domains and skills orbiting a central core node.
- **Skills Library** — domain cards (Trading, Coding, Research, Business, Personal, Legal, Creative, AI/Automation, Data & Analytics, Web3/Blockchain) listing top skills per domain — 141 skills across 10 domains.
- **Core Engine** — status of the Memory, Skills, Agents, Loops, and Actions layers.
- **Active Loops / Agent Operations** — live status of running automation loops and agents.
- **Memory System** — Hot, Warm, Cold, and Archive memory tiers.
- **Chat panel** — orchestrator chat with Chat / Voice / Vision / Desktop interface modes.

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
  data/         Domain and skill data
  hooks/        Float physics, socket hooks
  context/      BackendContext — health/agents polling + WebSocket state
  styles/       Global theme and layout
electron/       Electron main + preload scripts
```
