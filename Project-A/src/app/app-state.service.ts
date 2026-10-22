import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

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

@Injectable({
  providedIn: 'root'
})

export class AppStateService {

  private initialState: AppState = {
    countB: 0,
    countC: 0,
    todos: [],
  };

  private stateSubject = new BehaviorSubject<AppState>(this.initialState);

  readonly state$: Observable<AppState> = this.stateSubject.asObservable();

  private get currentState(): AppState {
    return this.stateSubject.value;
  }

  private updateState(newState: AppState): void {
    this.stateSubject.next(newState);
  }

  updateCounter(project: 'b' | 'c', action: 'increment' | 'decrement' | 'reset'): boolean {
    const state = this.currentState;
    const countKey = project === 'b' ? 'countB' : 'countC';

    let newCount: number;
    switch (action) {
      case 'increment':
        newCount = state[countKey] + 1;
        break;
      case 'decrement':
        newCount = state[countKey] - 1;
        break;
      case 'reset':
        newCount = 0;
        break;
    }

    this.updateState({
      ...state,
      [countKey]: newCount,
    });

    return true;
  }

  addTodo(text: string): boolean {
    if (!text.trim()) return false;

    const state = this.currentState;
    const newTodo: TodoItem = {
      id: Date.now(),
      text: text.trim(),
      completed: false,
    };

    this.updateState({
      ...state,
      todos: [...state.todos, newTodo],
    });

    return true;
  }

  toggleTodo(id: number): boolean {
    const state = this.currentState;
    const todos = state.todos.map(todo =>
      todo.id === id ? { ...todo, completed: !todo.completed } : todo
    );

    this.updateState({
      ...state,
      todos,
    });

    return true;
  }

  editTodo(id: number, text: string): boolean {
    if (!text.trim()) return false;

    const state = this.currentState;
    const todos = state.todos.map(todo =>
      todo.id === id ? { ...todo, text: text.trim() } : todo
    );

    this.updateState({
      ...state,
      todos,
    });

    return true;
  }

  deleteTodo(id: number): boolean {
    const state = this.currentState;
    const todos = state.todos.filter(todo => todo.id !== id);

    this.updateState({
      ...state,
      todos,
    });

    return true;
  }
}
