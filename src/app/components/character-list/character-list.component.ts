import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CharacterMapping } from '../../models/character-mapping';
import { CharacterService } from '../../services/character.service';

@Component({
  selector: 'app-character-list',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './character-list.component.html',
  styleUrls: ['./character-list.component.css']
})
export class CharacterListComponent implements OnInit {
  characters: CharacterMapping[] = [];
  showForm = false;
  editingCharacter: CharacterMapping | null = null;
  currentCharacter: CharacterMapping = this.createEmptyCharacter();
  patternsText = '';
  previewText = 'Hello, this is a voice preview.';
  synth = window.speechSynthesis;
  availableVoices: { id: string; name: string; lang: string }[] = [];

  constructor(private characterService: CharacterService) {
    this.loadVoices();
    this.synth.onvoiceschanged = () => {
      this.loadVoices();
    };
  }

  loadVoices() {
    const voices = this.synth.getVoices();
    this.availableVoices = voices.map(voice => ({
      id: voice.name,
      name: `${voice.name} (${voice.lang})`,
      lang: voice.lang
    }));
  }

  ngOnInit() {
    this.characters = this.characterService.getCharacters();
    if (this.characters.length === 0) {
      this.characters.push({
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
      });
      this.updateCharacters();
    }
  }

  createEmptyCharacter(): CharacterMapping {
    return {
      id: `char_${this.characters.length + 1}`.padStart(6, '0'),
      name: '',
      patterns: [],
      defaultEmotion: 'NEUTRAL',
      voiceSettings: {
        pitch: 1.0,
        rate: 1.0,
        voice: 'Microsoft David - English (United States)',
        volume: 1.0
      }
    };
  }

  startNewCharacter() {
    this.editingCharacter = null;
    this.currentCharacter = this.createEmptyCharacter();
    this.patternsText = '';
    this.showForm = true;
  }

  editCharacter(character: CharacterMapping) {
    this.editingCharacter = character;
    this.currentCharacter = { ...character };
    this.patternsText = character.patterns.join('\n');
    this.showForm = true;
  }

  saveCharacter() {
    const character = {
      ...this.currentCharacter,
      patterns: this.patternsText.split('\n').filter(p => p.trim())
    };

    if (this.editingCharacter) {
      const index = this.characters.findIndex(c => c.id === this.editingCharacter!.id);
      if (index !== -1) {
        this.characters[index] = character;
      }
    } else {
      this.characters.push(character);
    }

    this.updateCharacters();
    this.cancelEdit();
  }

  updateCharacters() {
    this.characterService.updateCharacters([...this.characters]);
  }

  cancelEdit() {
    this.showForm = false;
    this.editingCharacter = null;
    this.currentCharacter = this.createEmptyCharacter();
    this.patternsText = '';
  }

  deleteCharacter(character: CharacterMapping) {
    if (character.id === 'narrator') {
      alert('Cannot delete the narrator character!');
      return;
    }
    
    if (confirm(`Are you sure you want to delete ${character.name}?`)) {
      this.characters = this.characters.filter(c => c.id !== character.id);
      this.updateCharacters();
    }
  }

  getVoiceName(voiceId: string): string {
    return this.availableVoices.find(v => v.id === voiceId)?.name || voiceId;
  }

  previewVoice() {
    this.synth.cancel();
    const utterance = new SpeechSynthesisUtterance(this.previewText);
    utterance.pitch = this.currentCharacter.voiceSettings.pitch;
    utterance.rate = this.currentCharacter.voiceSettings.rate;
    utterance.volume = this.currentCharacter.voiceSettings.volume;
    
    const voices = this.synth.getVoices();
    const voice = voices.find(v => v.name === this.currentCharacter.voiceSettings.voice);
    if (voice) {
      utterance.voice = voice;
    }
    
    this.synth.speak(utterance);
  }

  exportCharacters() {
    const charactersData = {
      version: "1.0",
      exportDate: new Date().toISOString(),
      characters: this.characters
    };

    const blob = new Blob([JSON.stringify(charactersData, null, 2)], { type: 'application/json' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'character-list.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  }

  async importCharacters(event: any) {
    const file = event.target.files[0];
    if (!file) return;

    try {
      const text = await file.text();
      const data = JSON.parse(text);

      // Validate the imported data
      if (!data.characters || !Array.isArray(data.characters)) {
        throw new Error('Invalid character list format');
      }

      // Validate each character
      data.characters.forEach((char: any) => {
        if (!char.id || !char.name || !char.patterns || !char.voiceSettings) {
          throw new Error('Invalid character format');
        }
      });

      // Keep the narrator if it exists in current list
      const narrator = this.characters.find(c => c.id === 'narrator');
      
      // Update the characters list
      this.characters = data.characters;

      // Ensure narrator is always present
      if (narrator && !this.characters.find(c => c.id === 'narrator')) {
        this.characters.unshift(narrator);
      }

      // Update the service
      this.updateCharacters();

      alert('Characters imported successfully!');
    } catch (error) {
      console.error('Error importing characters:', error);
      alert('Error importing characters. Please check the file format.');
    }

    // Reset the file input
    event.target.value = '';
  }
}