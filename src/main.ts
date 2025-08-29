import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { App } from './app/app';
import amplifyOutputs from '../amplify_outputs.json';

// Load Amplify outputs into global scope for services to access
(window as any).amplifyOutputs = amplifyOutputs;

bootstrapApplication(App, appConfig)
  .catch((err) => console.error(err));
