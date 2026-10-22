# Project C: remote todo deletion

Read the [workspace guide](../README.md) for the full setup and message flow.

## Responsibility

C runs in its own tab, deletes todos, and controls counter C. It does not add or edit tasks.

## Run

From this directory:

```powershell
npm ci
npm start
```

Build with `npm run build`. Start all three projects and use http://localhost:4202 in the same browser profile.

## How it connects

- App.ngOnInit() uses loadRemoteModule() to load A's ./AppState.
- It stores the exported module.appState client.
- The client creates an A-origin bridge iframe and connects to the named SharedWorker.
- The worker sends its current BehaviorSubject value.
- AsyncPipe renders snapshots from the client.state$ observable.
- The local app-state.ts is only an interface; it creates no store.

## Actions

Counter methods send updateCounter('c', action). Delete sends deleteTodo(id), and the worker removes the task from its BehaviorSubject. Every open app receives the updated list.

A adds/completes tasks and B edits text.

## Status and lifetime

Controls are disabled while the client is disconnected or awaiting its own action's reply. Request IDs distinguish an acknowledgement from another tab's broadcast. Errors appear in the UI.

The store exists in browser memory, without localStorage or a backend. Reloading one tab can recover data while another connected app remains open. Closing every connected tab or terminating the worker loses data.

Use Chrome or Edge with localhost consistently. The workspace guide describes deployment origins, limitations, and troubleshooting. Edit/delete ownership is UI behavior, not authenticated security.
