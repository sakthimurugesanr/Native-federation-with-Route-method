# Angular Native Federation — Micro-Frontend Monorepo

A three-app Angular micro-frontend workspace powered by **[@angular-architects/native-federation](https://github.com/angular-architects/module-federation-plugin)** (v22.2.2). The apps share a single reactive RxJS state store without any bundler plugins, leveraging native ES modules in the browser.

---

## Table of Contents

- [Architecture Overview](#architecture-overview)
- [Project Structure](#project-structure)
- [How Native Federation Works Here](#how-native-federation-works-here)
- [Shared State Architecture](#shared-state-architecture)
- [Federation Configuration](#federation-configuration)
- [Features by Project](#features-by-project)
- [Getting Started](#getting-started)
- [Development Ports](#development-ports)
- [Build](#build)
- [Key Design Decisions](#key-design-decisions)
- [Tech Stack](#tech-stack)

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────┐
│               Project-A  (Shell / Host)                  │
│                    localhost:4200                         │
│                                                           │
│  ┌─────────────────┐     ┌──────────────────────────┐   │
│  │  HomeComponent  │     │  AppStateService (shared) │   │
│  │  - Live counters│     │  - BehaviorSubject store  │   │
│  │  - Todo list    │     │  - Exposed via federation │   │
│  └─────────────────┘     └──────────────────────────┘   │
│                                                           │
│   /project-b ──────────► loads Project-B remotely        │
│   /project-c ──────────► loads Project-C remotely        │
└─────────────────────────────────────────────────────────┘
         ▲ remoteEntry.json          ▲ remoteEntry.json
         │                           │
┌─────────────────┐       ┌─────────────────────┐
│   Project-B     │       │      Project-C       │
│ localhost:4201  │       │   localhost:4202      │
│                 │       │                       │
│ Counter (B)     │       │  Counter (C)          │
│ Todo edit       │       │  Todo delete          │
└─────────────────┘       └─────────────────────┘
         │                           │
         └─────────┬─────────────────┘
                   ▼
         Loads AppStateService
         from Project-A via
         loadRemoteModule()
```

**Project-A** is the shell (host). It owns the router, the navigation bar, and the single source of truth — `AppStateService`. It lazy-loads Project-B and Project-C as remote components via `loadRemoteModule`, and exposes its service back to them so all three apps share identical state.

---

## Project Structure

```
Project-angular/
├── Project-A/                  # Shell / Host application
│   ├── src/
│   │   ├── main.ts             # initFederation() entry point
│   │   ├── bootstrap.ts        # Angular bootstrapApplication
│   │   ├── app/
│   │   │   ├── app.ts          # Root component + nav bar
│   │   │   ├── app.routes.ts   # Lazy routes to B and C
│   │   │   ├── app-state.service.ts  # ← Shared RxJS store (EXPOSED)
│   │   │   ├── home.component.ts     # Dashboard with live counters
│   │   │   ├── todo.ts               # Add/toggle todos
│   │   │   └── not-found.component.ts
│   │   └── index.html
│   ├── public/
│   │   ├── state-bridge.js     # iframe ↔ SharedWorker bridge
│   │   ├── state-bridge.html   # Bridge host page
│   │   └── state-worker.js     # SharedWorker RxJS store (fallback)
│   └── federation.config.js    # Host: exposes AppStateService, remotes B & C
│
├── Project-B/                  # Remote — Counter B + Todo editor
│   ├── src/app/
│   │   ├── app.ts              # Loads AppStateService from Project-A
│   │   ├── app-state.ts        # TypeScript interface (type-only import)
│   │   └── app.html / app.css
│   └── federation.config.js    # Remote: exposes ./Component
│
├── Project-C/                  # Remote — Counter C + Todo deleter
│   ├── src/app/
│   │   ├── app.ts              # Loads AppStateService from Project-A
│   │   ├── app-state.ts        # TypeScript interface (type-only import)
│   │   └── app.html / app.css
│   └── federation.config.js    # Remote: exposes ./Component
│
└── README.md
```

---

## How Native Federation Works Here

Native Federation uses **native ES module imports** (`import()`) instead of Webpack's module federation. Each app publishes a `remoteEntry.json` at its root that describes what it exposes and what shared dependencies it provides.

### Bootstrap sequence

```
main.ts
  └─ initFederation()          ← reads remoteEntry.json files for all declared remotes
       └─ bootstrap.ts
            └─ bootstrapApplication(App, appConfig)
```

`initFederation()` must complete before Angular bootstraps. This ensures all remote manifests are fetched and import maps are registered before any lazy route is hit.

### Lazy route loading (Project-A → B or C)

```typescript
// app.routes.ts
{
  path: 'project-b',
  loadComponent: () =>
    loadRemoteModule({
      remoteEntry: 'http://localhost:4201/remoteEntry.json',
      remoteName: 'project-b',
      exposedModule: './Component',
    }).then(m => m.App),
}
```

When the user navigates to `/project-b`, Angular's router calls `loadRemoteModule`, which fetches Project-B's bundle on demand and returns its exported `App` component.

### Reverse service loading (B/C → Project-A)

Project-B and Project-C both load `AppStateService` back from Project-A at runtime:

```typescript
// Project-B / Project-C  app.ts
const module = await loadRemoteModule({
  remoteEntry: 'http://localhost:4200/remoteEntry.json',
  remoteName: 'project-a',
  exposedModule: './AppStateService',
});
const ServiceClass = module.AppStateService;
this.appState = this.injector.get(ServiceClass);
```

Because `singleton: true` is set in `shareAll`, Angular's DI container gives B and C the **same instance** of `AppStateService` that Project-A created — all three apps react to the same `BehaviorSubject`.

---

## Shared State Architecture

### Primary path — Angular DI singleton

`AppStateService` is provided at root (`providedIn: 'root'`) and shared via federation with `singleton: true`. When B/C load the service class via `loadRemoteModule` and then call `injector.get(ServiceClass)`, they receive the single instance from Project-A's DI tree.

```
AppStateService (Project-A DI)
   └─ BehaviorSubject<AppState>
        ├─ HomeComponent (Project-A) subscribes via async pipe
        ├─ Project-B App subscribes via async pipe
        └─ Project-C App subscribes via async pipe
```

### Fallback path — SharedWorker + state bridge

For scenarios where the DI singleton approach isn't available (e.g. completely separate browser tabs), Project-A provides a `SharedWorker`-based fallback:

- `state-worker.js` — a `SharedWorker` that holds the authoritative `BehaviorSubject` store and fans out state to all connected ports.
- `state-bridge.js` — runs inside a hidden `<iframe>` served from Project-A's origin; bridges `postMessage` communication between the parent app and the worker.
- `state-bridge.html` — the iframe document that hosts `state-bridge.js`.

This ensures state remains consistent even if the apps run in separate tabs (requires Chrome or Edge for `SharedWorker` support).

### AppState shape

```typescript
interface AppState {
  countB: number;   // Controlled by Project-B
  countC: number;   // Controlled by Project-C
  todos: TodoItem[];
}

interface TodoItem {
  id: number;
  text: string;
  completed: boolean;
}
```

---

## Federation Configuration

### Project-A — Host (exposes + remotes)

```javascript
// federation.config.js
module.exports = withNativeFederation({
  name: 'project-a',
  exposes: {
    './AppStateService': './src/app/app-state.service.ts',  // shared singleton
  },
  remotes: {
    'project-b': 'http://localhost:4201/remoteEntry.json',
    'project-c': 'http://localhost:4202/remoteEntry.json',
  },
  shared: {
    ...shareAll({ singleton: true, strictVersion: true, requiredVersion: 'auto' }),
  },
});
```

### Project-B — Remote (exposes component, consumes A)

```javascript
module.exports = withNativeFederation({
  name: 'project-b',
  exposes: {
    './Component': './src/app/app.ts',
  },
  remotes: {
    'project-a': 'http://localhost:4200/remoteEntry.json',
  },
  shared: {
    ...shareAll({ singleton: true, strictVersion: true, requiredVersion: 'auto' }),
  },
});
```

### Project-C — Remote (exposes component, consumes A)

```javascript
module.exports = withNativeFederation({
  name: 'project-c',
  exposes: {
    './Component': './src/app/app.ts',
  },
  remotes: {
    'project-a': 'http://localhost:4200/remoteEntry.json',
  },
  shared: {
    ...shareAll({ singleton: true, strictVersion: true, requiredVersion: 'auto' }),
  },
});
```

---

## Features by Project

### Project-A (Shell — `/`)
- Navigation bar linking to all three routes
- **Home dashboard** showing live counter values for Project B and C (updates in real-time via `async` pipe)
- **Todo list** — add tasks and toggle completion
- Exposes `AppStateService` to the federation

### Project-B (`/project-b`)
- **Counter B** — increment / decrement / reset; updates `countB` in the shared store
- **Todo editor** — inline edit any existing task by clicking its text; saves back to the shared store

### Project-C (`/project-c`)
- **Counter C** — increment / decrement / reset; updates `countC` in the shared store
- **Todo deleter** — delete any task from the shared todo list

All state changes are immediately reflected on the Project-A home dashboard because all components subscribe to the same `BehaviorSubject`.

---

## Getting Started

### Prerequisites

- Node.js 20+
- npm 11+
- Angular CLI 22 (`npm install -g @angular/cli`)

### Install dependencies

Run `npm install` inside each project folder:

```bash
cd Project-A && npm install
cd ../Project-B && npm install
cd ../Project-C && npm install
```

### Run all three apps

Open **three separate terminals**, one per project:

```bash
# Terminal 1 — Shell (must start first)
cd Project-A
ng serve --port 4200

# Terminal 2 — Remote B
cd Project-B
ng serve --port 4201

# Terminal 3 — Remote C
cd Project-C
ng serve --port 4202
```

> **Start Project-A first.** Project-B and C load `AppStateService` from `http://localhost:4200/remoteEntry.json` at runtime — if Project-A isn't running they will log an error and render without state.

Open your browser at **http://localhost:4200**.

---

## Development Ports

| Project   | Role          | URL                     |
|-----------|---------------|-------------------------|
| Project-A | Shell / Host  | http://localhost:4200   |
| Project-B | Remote        | http://localhost:4201   |
| Project-C | Remote        | http://localhost:4202   |

The ports are declared in:
- `Project-A/angular.json` → `serve-original.options.port: 4200`
- `Project-B/federation.config.js` → referenced as `http://localhost:4201`
- `Project-C/federation.config.js` → referenced as `http://localhost:4202`

---

## Build

```bash
# Build Project-A (shell)
cd Project-A && ng build

# Build Project-B
cd Project-B && ng build

# Build Project-C
cd Project-C && ng build
```

Output lands in each project's `dist/` folder. For production deployment, remotes must be hosted before the shell, and the `remoteEntry` URLs in `app.routes.ts` and `federation.config.js` should point to the production origins.

---

## Key Design Decisions

**`singleton: true` + `strictVersion: true` on all shared libs**
Guarantees that only one copy of Angular, RxJS, etc. runs in the page at once. If a version mismatch is detected at runtime, an error is thrown rather than silently loading a second copy.

**Service exposed via federation, not copied**
`AppStateService` is declared in Project-A's `exposes` map and loaded by B/C via `loadRemoteModule`. This means B and C import the actual class from A's bundle, so Angular DI resolves to the exact same singleton instance — not a structurally equivalent but distinct class.

**Type-only interfaces in remotes**
Project-B and C each have a local `app-state.ts` that re-declares the `AppState` and `AppStateService` interfaces using `import type`. These are erased at compile time, so the remotes never bundle any state code themselves.

**`window.__appStateService` fast-path**
Before calling `loadRemoteModule`, B and C check `window.__appStateService`. This allows a parent shell to pre-inject the service instance (useful in testing or iframe embedding scenarios) and skip the federation round-trip entirely.

**SharedWorker fallback for cross-tab scenarios**
When running the apps in separate browser tabs (outside the federation singleton boundary), the `state-worker.js` SharedWorker keeps state in sync across origins via a `postMessage` bridge hosted on Project-A's origin.

---

## Tech Stack

| Technology | Version | Purpose |
|---|---|---|
| Angular | 22.2.x | Framework |
| @angular-architects/native-federation | 22.2.2 | Module federation (no Webpack) |
| RxJS | 7.8.x | Reactive state (`BehaviorSubject`) |
| TypeScript | 6.0.x | Type safety |
| es-module-shims | 2.8.x | Import map polyfill |
| Angular Router | 22.2.2 | Lazy route loading for remotes |
