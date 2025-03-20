import { Component } from '@angular/core';
import { bootstrapApplication } from '@angular/platform-browser';
import { CharacterListComponent } from './app/components/character-list/character-list.component';
import { ScriptProcessorComponent } from './app/components/script-processor/script-processor.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CharacterListComponent, ScriptProcessorComponent],
  template: `
    <div class="app-container">
      <h1>Character Mapping Application</h1>
      <div class="main-content">
        <app-character-list></app-character-list>
        <app-script-processor></app-script-processor>
      </div>
    </div>
  `,
  styles: [`
    .app-container {
      max-width: 1200px;
      margin: 0 auto;
      padding: 20px;
    }
    .main-content {
      display: grid;
      grid-template-columns: 1fr 2fr;
      gap: 20px;
    }
  `]
})
export class App {
  name = 'Character Mapping';
}

bootstrapApplication(App);