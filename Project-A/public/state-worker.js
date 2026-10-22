importScripts('/worker/rxjs.umd.min.js');

const store = new rxjs.BehaviorSubject({ countB: 0, countC: 0, todos: [] });
const clients = new Set();
let nextTodoId = 1;

store.subscribe(state => {
  for (const client of clients) {
    try {
      client.postMessage({ type: 'state', state });
    } catch {
      clients.delete(client);
    }
  }
});

function taskText(text) {
  if (typeof text !== 'string' || !text.trim()) throw new Error('Task text cannot be blank.');
  return text.trim();
}


function findTask(state, id) {
  const task = state.todos.find(task => task.id === id);
  if (!task) throw new Error('This task no longer exists. Use the updated list.');
  return task;
}


function updateCounter(state, action) {
  if (!['b', 'c'].includes(action.project) ||
    !['increment', 'decrement', 'reset'].includes(action.action)) {
    throw new Error('Invalid counter action.');
  }
  const key = action.project === 'b' ? 'countB' : 'countC';
  if (action.action === 'increment') state[key]++;
  if (action.action === 'decrement') state[key]--;
  if (action.action === 'reset') state[key] = 0;
  if (!Number.isSafeInteger(state[key])) throw new Error('Counter limit reached.');
}


function applyAction(action) {
  if (!action) throw new Error('Invalid action.');

  const state = structuredClone(store.value);

  switch (action.type) {
    case 'counter':
      updateCounter(state, action);
      break;
    case 'addTodo': {
      const text = taskText(action.text);
      state.todos.push({ id: nextTodoId++, text, completed: false });
      break;
    }
    case 'toggleTodo': {
      const task = findTask(state, action.id);
      task.completed = !task.completed;
      break;
    }
    case 'editTodo':
      findTask(state, action.id).text = taskText(action.text);
      break;
    case 'deleteTodo':
      findTask(state, action.id);
      state.todos = state.todos.filter(task => task.id !== action.id);
      break;
    default:
      throw new Error('Unknown action.');
  }

  store.next(state);
}

self.onconnect = event => {
  const port = event.ports[0];
  clients.add(port);

  port.onmessage = event => {
    const message = event.data;
    if (message?.type === 'disconnect') {
      clients.delete(port);
      port.close();
      if (clients.size === 0) self.close();
      return;
    }
    if (message?.type !== 'action' || typeof message.requestId !== 'string') return;

    try {
      applyAction(message.action);
      port.postMessage({ type: 'done', requestId: message.requestId });
    } catch (error) {
      port.postMessage({ type: 'error', requestId: message.requestId, message: error.message });
    }
  };

  port.start();
  port.postMessage({ type: 'state', state: store.value });
};
