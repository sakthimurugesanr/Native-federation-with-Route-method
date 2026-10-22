import { AsyncPipe } from '@angular/common';
import { ChangeDetectorRef, Component, inject, Injector, OnInit } from '@angular/core';
import { loadRemoteModule } from '@angular-architects/native-federation';
import type { AppStateService } from './app-state';

@Component({
  selector: 'app-counter-c',
  imports: [AsyncPipe],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App implements OnInit {
  appState: any = null;

  private injector = inject(Injector);
  private cdr = inject(ChangeDetectorRef);

  async ngOnInit() {
    console.log('[Project C] ngOnInit called');

    const win = window as any;
    if (win.__appStateService) {
      this.appState = win.__appStateService;
      console.log('[Project C] Service loaded from window:', this.appState);
      this.cdr.detectChanges();
      return;
    }

    try {
      console.log('[Project C] Loading service via Module Federation...');
      const module: any = await loadRemoteModule({
        remoteEntry: 'http://localhost:4200/remoteEntry.json',
        remoteName: 'project-a',
        exposedModule: './AppStateService'
      });

      const ServiceClass = module.AppStateService;
      this.appState = this.injector.get(ServiceClass) as AppStateService;
      console.log('[Project C] Service loaded via federation:', this.appState);
      this.cdr.detectChanges();
    } catch (err) {
      console.error('[Project C] Could not load service:', err);
    }
  }

  increment() {
    this.appState?.updateCounter('c', 'increment');
  }

  decrement() {
    this.appState?.updateCounter('c', 'decrement');
  }

  reset() {
    this.appState?.updateCounter('c', 'reset');
  }

  deleteTask(id: number) {
    this.appState?.deleteTodo(id);
  }

  error = () => this.appState ? '' : 'Service not available. Start Project A on port 4200.';
}
