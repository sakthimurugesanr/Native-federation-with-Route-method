import { AsyncPipe } from '@angular/common';
import { ChangeDetectorRef, Component, inject, Injector, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { loadRemoteModule } from '@angular-architects/native-federation';
import type { AppStateService, TodoItem } from './app-state';

@Component({
  selector: 'app-counter-b',
  imports: [AsyncPipe, FormsModule],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App implements OnInit {
  appState: any = null;
  editingId: number | null = null;
  draftText = '';

  private injector = inject(Injector);
  private cdr = inject(ChangeDetectorRef);

  async ngOnInit() {
    console.log('[Project B] ngOnInit called');

    const win = window as any;
    if (win.__appStateService) {
      this.appState = win.__appStateService;
      console.log('[Project B] Service loaded from window:', this.appState);
      this.cdr.detectChanges();
      return;
    }

    try {
      console.log('[Project B] Loading service via Module Federation...');
      const module: any = await loadRemoteModule({
        remoteEntry: 'http://localhost:4200/remoteEntry.json',
        remoteName: 'project-a',
        exposedModule: './AppStateService'
      });

      const ServiceClass = module.AppStateService;
      this.appState = this.injector.get(ServiceClass) as AppStateService;
      console.log('[Project B] Service loaded via federation:', this.appState);
      this.cdr.detectChanges();
    } catch (err) {
      console.error('[Project B] Could not load service:', err);
    }
  }

  increment() {
    this.appState?.updateCounter('b', 'increment');
  }

  decrement() {
    this.appState?.updateCounter('b', 'decrement');
  }

  reset() {
    this.appState?.updateCounter('b', 'reset');
  }

  startEditing(task: TodoItem) {
    this.editingId = task.id;
    this.draftText = task.text;
  }

  saveTask(id: number) {
    const text = this.draftText.trim();
    if (text && this.appState?.editTodo(id, text)) this.cancelEditing();
  }

  cancelEditing() {
    this.editingId = null;
    this.draftText = '';
  }

  error = () => this.appState ? '' : 'Service not available. Start Project A on port 4200.';
}
