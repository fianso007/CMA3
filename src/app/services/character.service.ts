import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { CharacterMapping } from '../models/character-mapping';

@Injectable({
  providedIn: 'root'
})
export class CharacterService {
  private charactersSubject = new BehaviorSubject<CharacterMapping[]>([{
    id: 'narrator',
    name: 'Narrator',
    patterns: ['^[^"\']*$'],
    defaultEmotion: 'NEUTRAL',
    voiceSettings: {
      pitch: 1.0,
      rate: 1.0,
      voice: 'Microsoft David - English (United States)',
      volume: 1.0
    }
  }]);

  characters$ = this.charactersSubject.asObservable();

  updateCharacters(characters: CharacterMapping[]) {
    this.charactersSubject.next(characters);
  }

  getCharacters() {
    return this.charactersSubject.value;
  }
}