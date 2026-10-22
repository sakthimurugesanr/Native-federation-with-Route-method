# Project A: shared RxJS store and todo creation

Read the [workspace guide](../README.md) for the full setup and message flow.

## Responsibility

A creates/completes todos and displays B/C counters. Its links open B and C in separate tabs. A serves the one common RxJS store and the federated client.

## Run

From this directory:

```powershell
npm ci
npm start
```

Build with `npm run build`. Start all three projects and use http://localhost:4200 in the same browser profile.

## How it connects

- public/state-worker.js owns the ONLY BehaviorSubject holding countB, countC, and todos.
- public/state-bridge.html/state-bridge.js let every app connect to this A-origin worker.
- angular.json serves the installed RxJS UMD bundle at /worker/rxjs.umd.min.js.
- src/app/app-state.service.ts is an observable client, not a second store.
- federation.config.js exposes the client as ./AppState.
- App and Todo subscribe to the client's state$ using AsyncPipe.

## Actions

Todo.addTask() sends addTodo(text). Todo.toggleTask(id) sends toggleTodo(id). The worker assigns IDs and performs changes. Its store subscription broadcasts snapshots to all tabs.

The root summary reads countB/countC. B/C are opened as separate pages; there is no embedded remote UI or routing.

## Status and lifetime

Controls are disabled while the client is disconnected or awaiting its own action's reply. Request IDs distinguish an acknowledgement from another tab's broadcast. Errors appear in the UI.

The store exists in browser memory, without localStorage or a backend. Reloading one tab can recover data while another connected app remains open. Closing every connected tab or terminating the worker loses data.

Use Chrome or Edge with localhost consistently. The workspace guide describes deployment origins, limitations, and troubleshooting. Edit/delete ownership is UI behavior, not authenticated security.
