import { AsyncPipe } from '@angular/common';
import { Component, inject } from '@angular/core';
import { AppStateService } from './app-state.service';
import { Todo } from './todo';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [AsyncPipe, Todo],
  template: `
    <header>
      <h1>Project A</h1>
      <p>One common RxJS store for Project A, B, and C with Angular Router.</p>
    </header>

    <main>
      @if (state$ | async; as state) {
        <section class="counter-summary" aria-label="Live counter values">
          <h2>Live counters</h2>
          <p aria-live="polite">Project B: <strong>{{ state.countB }}</strong></p>
          <p aria-live="polite">Project C: <strong>{{ state.countC }}</strong></p>
          <p>Shared state updates in real-time across all routes.</p>
        </section>
      }
      <section class="todo-panel" aria-label="Project A tasks">
        <app-todo />
      </section>
    </main>
  `,
  styleUrl: './app.css',
})

export class HomeComponent {
  private appStateService = inject(AppStateService);
  state$ = this.appStateService.state$;
}
