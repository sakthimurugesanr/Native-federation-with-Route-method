const { withNativeFederation, shareAll } = require('@angular-architects/native-federation/config');

module.exports = withNativeFederation({
  name: 'project-a',
  features: {
    ignoreUnusedDeps: false,
  },
  exposes: {
    './AppStateService': './src/app/app-state.service.ts',
  },
  remotes: {
    'project-b': 'http://localhost:4201/remoteEntry.json',
    'project-c': 'http://localhost:4202/remoteEntry.json',
  },
  shared: {
    ...shareAll({ singleton: true, strictVersion: true, requiredVersion: 'auto' }),
  },

  skip: [
    '@angular/platform-browser/animations',
    '@angular/platform-browser/animations/async',
    'rxjs/ajax',
    'rxjs/fetch',
    'rxjs/testing',
    'rxjs/webSocket',
  ],

});
