import type { Observable } from 'rxjs';

export interface TodoItem {
  id: number;
  text: string;
  completed: boolean;
}

export interface AppState {
  countB: number;
  countC: number;
  todos: TodoItem[];
}

export interface AppStateService {
  readonly state$: Observable<AppState>;
  updateCounter(project: 'b' | 'c', action: 'increment' | 'decrement' | 'reset'): boolean;
  editTodo(id: number, text: string): boolean;
}
