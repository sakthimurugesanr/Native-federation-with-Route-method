import { Component, inject } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AppStateService } from './app-state.service';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  styleUrl: './app.css',
  templateUrl: './app.html',
})
export class App {

  constructor() {

    const appStateService = inject(AppStateService);

    (window as any).__appStateService = appStateService;
    console.log('[Project A] Service exposed on window:', appStateService);
  }
}
