const channel = 'project-a-state';
const allowedOrigins = new Set([
  'http://localhost:4200', 'http://localhost:4201', 'http://localhost:4202',
]);
let parentOrigin;
let worker;

function sendToParent(message) {
  if (parentOrigin) window.parent.postMessage({ channel, ...message }, parentOrigin);
}

function connectionError() {
  sendToParent({
    type: 'error', fatal: true,
    message: 'Shared store connection failed. Use Chrome or Edge and reload the apps.',
  });
}

function connect() {
  try {
    worker = new SharedWorker('/state-worker.js', 'project-a-rxjs-store');
    worker.onerror = connectionError;
    worker.port.onmessage = event => sendToParent(event.data);
    worker.port.onmessageerror = connectionError;
  } catch {
    connectionError();
  }
}

window.addEventListener('message', event => {
  if (event.source !== window.parent || !allowedOrigins.has(event.origin)) return;
  const message = event.data;
  if (message?.channel !== channel) return;
  parentOrigin = event.origin;
  if (message.type === 'connect' && !worker) connect();
  if (message.type === 'action' && worker) worker.port.postMessage(message);
});

window.addEventListener('pagehide', () => {
  if (worker) {
    worker.port.postMessage({ type: 'disconnect' });
    worker.port.close();
    worker = undefined;
  }
});

window.addEventListener('pageshow', event => {
  if (event.persisted && parentOrigin && !worker) connect();
});
