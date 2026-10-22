// import { Routes } from '@angular/router';
// import { loadRemoteModule } from '@angular-architects/native-federation';

// export const routes: Routes = [
//   {
//     path: '',

//     loadComponent: () => import('./home.component').then(m => m.HomeComponent),
//   },
//   {
//     path: 'project-b',

//     loadComponent: () =>
//       loadRemoteModule({
//         remoteEntry: 'http://localhost:4201/remoteEntry.json',
//         remoteName: 'project-b',
//         exposedModule: './Component'
//       }).then(m => m.App),
//   },
//   {
//     path: 'project-c',

//     loadComponent: () =>
//       loadRemoteModule({
//         remoteEntry: 'http://localhost:4202/remoteEntry.json',
//         remoteName: 'project-c',
//         exposedModule: './Component'
//       }).then(m => m.App),
//   },
// ];

import { Routes } from '@angular/router';
import { loadRemoteModule } from '@angular-architects/native-federation';

export const routes: Routes = [
  {
    path: '',
    pathMatch: 'full',
    loadComponent: () =>
      import('./home.component').then(m => m.HomeComponent),
  },
  {
    path: 'project-b',
    loadComponent: () =>
      loadRemoteModule({
        remoteEntry: 'http://localhost:4201/remoteEntry.json',
        remoteName: 'project-b',
        exposedModule: './Component',
      }).then(m => m.App),
  },
  {
    path: 'project-c',
    loadComponent: () =>
      loadRemoteModule({
        remoteEntry: 'http://localhost:4202/remoteEntry.json',
        remoteName: 'project-c',
        exposedModule: './Component',
      }).then(m => m.App),
  },
  {
    path: 'not-found',
    loadComponent: () =>
      import('./not-found.component').then(m => m.NotFoundComponent),
  },

  // Keep this last: unmatched URLs redirect to the not-found page.
  {
    path: '**',
    redirectTo: 'not-found',
  },
];