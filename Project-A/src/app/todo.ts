import { AsyncPipe } from '@angular/common';
import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AppStateService } from './app-state.service';

@Component({
  selector: 'app-todo',
  imports: [AsyncPipe, FormsModule],
  templateUrl: './todo.html',
  styleUrl: './todo.css',
})
export class Todo {

  private appStateService = inject(AppStateService);
  state$ = this.appStateService.state$;
  newTask = '';

  addTask() {
    if (this.appStateService.addTodo(this.newTask)) this.newTask = '';
  }

  toggleTask(id: number) {
    this.appStateService.toggleTodo(id);
  }
}
