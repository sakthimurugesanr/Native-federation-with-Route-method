import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-not-found',
  standalone: true,
  imports: [RouterLink],
  template: `
    <h2>Module is not available</h2>
    <p>The requested page does not exist.</p>
    <a routerLink="/">Go to Home</a>
  `,
})
export class NotFoundComponent {}