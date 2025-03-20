import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CharacterMapping } from '../../models/character-mapping';
import { CharacterService } from '../../services/character.service';

@Component({
  selector: 'app-script-processor',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './script-processor.component.html',
  styleUrls: ['./script-processor.component.css']
})
export class ScriptProcessorComponent implements OnInit {
  scriptContent: string = '';
  scriptLines: string[] = [];
  lineCharacters: string[] = [];
  lineTypes: string[] = [];
  lineEmotions: string[] = [];
  fileName: string = '';
  selectedLine: number = -1;
  inputMode: 'file' | 'text' = 'file';
  synth = window.speechSynthesis;
  isPlaying: boolean = false;
  currentPlayingLine: number = -1;
  characters: CharacterMapping[] = [];
  isGeneratingAudio: boolean = false;
  audioContext: AudioContext | null = null;
  
  constructor(private characterService: CharacterService) {}

  ngOnInit() {
    this.characterService.characters$.subscribe(characters => {
      this.characters = characters;
    });
  }
  

  onFileSelected(event: any) {
    const file = event.target.files[0];
    if (file) {
      this.fileName = file.name;
      const reader = new FileReader();
      reader.onload = (e) => {
        this.processText(e.target?.result as string);
      };
      reader.readAsText(file);
    }
  }

  processText(text: string) {
    this.scriptContent = text;
    this.scriptLines = this.scriptContent.split('\n').filter(line => line.trim());
    this.lineCharacters = new Array(this.scriptLines.length).fill('');
    this.lineTypes = new Array(this.scriptLines.length).fill('DIALOGUE');
    this.lineEmotions = new Array(this.scriptLines.length).fill('NEUTRAL');
  }

  onPastedText() {
    this.fileName = 'pasted-text.txt';
    this.processText(this.scriptContent);
  }

  updateLine(index: number) {
    this.selectedLine = index;
  }

  moveLine(index: number, direction: 'up' | 'down') {
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= this.scriptLines.length) return;

    // Move the line
    [this.scriptLines[index], this.scriptLines[newIndex]] = 
    [this.scriptLines[newIndex], this.scriptLines[index]];

    // Move associated data
    [this.lineCharacters[index], this.lineCharacters[newIndex]] = 
    [this.lineCharacters[newIndex], this.lineCharacters[index]];

    [this.lineTypes[index], this.lineTypes[newIndex]] = 
    [this.lineTypes[newIndex], this.lineTypes[index]];

    [this.lineEmotions[index], this.lineEmotions[newIndex]] = 
    [this.lineEmotions[newIndex], this.lineEmotions[index]];
  }

  deleteLine(index: number) {
    if (confirm('Are you sure you want to delete this line?')) {
      this.scriptLines.splice(index, 1);
      this.lineCharacters.splice(index, 1);
      this.lineTypes.splice(index, 1);
      this.lineEmotions.splice(index, 1);
    }
  }

  addNewLineAfter(index: number) {
    this.scriptLines.splice(index + 1, 0, '');
    this.lineCharacters.splice(index + 1, 0, '');
    this.lineTypes.splice(index + 1, 0, 'DIALOGUE');
    this.lineEmotions.splice(index + 1, 0, 'NEUTRAL');
    this.selectedLine = index + 1;
  }

  getTextareaRows(text: string): number {
    const lines = text.split('\n').length;
    return Math.max(1, Math.min(5, lines));
  }

  adjustTextareaHeight(event: Event) {
    const textarea = event.target as HTMLTextAreaElement;
    textarea.style.height = 'auto';
    textarea.style.height = textarea.scrollHeight + 'px';
  }

  updateFromEditableScript() {
    // Ensure all arrays are synchronized
    while (this.lineCharacters.length < this.scriptLines.length) {
      this.lineCharacters.push('');
      this.lineTypes.push('DIALOGUE');
      this.lineEmotions.push('NEUTRAL');
    }
    while (this.lineCharacters.length > this.scriptLines.length) {
      this.lineCharacters.pop();
      this.lineTypes.pop();
      this.lineEmotions.pop();
    }
  }

  isProcessingComplete(): boolean {
    return this.lineCharacters.every(char => char !== '');
  }

  getCharacterById(id: string): CharacterMapping | undefined {
    return this.characters.find(char => char.id === id);
  }

  async playLine(index: number) {
    if (this.isPlaying) {
      this.synth.cancel();
      this.isPlaying = false;
      this.currentPlayingLine = -1;
      return;
    }

    const characterId = this.lineCharacters[index];
    if (!characterId) {
      alert('Please select a character for this line first.');
      return;
    }

    const character = this.getCharacterById(characterId);
    if (!character) {
      alert('Character not found.');
      return;
    }

    this.isPlaying = true;
    this.currentPlayingLine = index;

    const utterance = new SpeechSynthesisUtterance(this.scriptLines[index]);
    utterance.pitch = character.voiceSettings.pitch;
    utterance.rate = character.voiceSettings.rate;
    utterance.volume = character.voiceSettings.volume;

    const voices = this.synth.getVoices();
    const voice = voices.find(v => v.name === character.voiceSettings.voice);
    if (voice) {
      utterance.voice = voice;
    }

    utterance.onend = () => {
      this.isPlaying = false;
      this.currentPlayingLine = -1;
    };

    this.synth.speak(utterance);
  }

  stopPlayback() {
    if (this.isPlaying) {
      this.synth.cancel();
      this.isPlaying = false;
      this.currentPlayingLine = -1;
    }
  }

  async generateAudioFile(format: 'mp3' | 'wav' = 'wav') {
    if (!this.isProcessingComplete()) {
      alert('Please assign characters to all lines first.');
      return;
    }

    this.isGeneratingAudio = true;
    const audioBlobs: Blob[] = [];
    
    try {
      for (let i = 0; i < this.scriptLines.length; i++) {
        const characterId = this.lineCharacters[i];
        const character = this.getCharacterById(characterId);
        
        if (!character) continue;

        const audioBlob = await this.textToAudioBlob(
          this.scriptLines[i],
          character.voiceSettings,
          
        );
        
        if (audioBlob) {
          audioBlobs.push(audioBlob);
        }
      }

      // Combine all audio blobs
      const mimeType = format === 'mp3' ? 'audio/mpeg' : 'audio/wav';
      const combinedBlob = new Blob(audioBlobs, { type: mimeType });
      
      // Download the file
      const url = URL.createObjectURL(combinedBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${this.fileName.replace('.txt', '')}_audio.${format}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error generating audio:', error);
      alert('Error generating audio file. Please try again.');
    } finally {
      this.isGeneratingAudio = false;
    }
  }

  // private async textToAudioBlob(text: string, voiceSettings: any, format: 'mp3' | 'wav'): Promise<Blob | null> {
  //   return new Promise((resolve) => {
  //     const utterance = new SpeechSynthesisUtterance(text);
  //     utterance.pitch = voiceSettings.pitch;
  //     utterance.rate = voiceSettings.rate;
  //     utterance.volume = voiceSettings.volume;

  //     const voices = this.synth.getVoices();
  //     const voice = voices.find(v => v.name === voiceSettings.voice);
  //     if (voice) {
  //       utterance.voice = voice;
  //     }

  //     // Use audio worklet for recording
  //     const audioCtx = new AudioContext();
  //     const destination = audioCtx.createMediaStreamDestination();
  //     const mimeType = format === 'mp3' ? 'audio/mpeg' : 'audio/wav';
  //     const mediaRecorder = new MediaRecorder(destination.stream, {
  //       mimeType: format === 'mp3' ? 'audio/webm;codecs=opus' : 'audio/webm;codecs=opus'
  //     });
      
  //     const chunks: Blob[] = [];

  //     mediaRecorder.ondataavailable = (e) => {
  //       if (e.data.size > 0) {
  //         chunks.push(e.data);
  //       }
  //     };

  //     mediaRecorder.onstop = async () => {
  //       const blob = new Blob(chunks, { type: 'audio/webm' });
        
  //       if (format === 'mp3') {
  //         // Convert to MP3 using FFmpeg.js or similar library
  //         // Note: This is a simplified version, you might want to add proper MP3 conversion
  //         resolve(blob);
  //       } else {
  //         resolve(blob);
  //       }
        
  //       audioCtx.close();
  //     };

  //     mediaRecorder.start();

  //     utterance.onend = () => {
  //       mediaRecorder.stop();
  //     };

  //     this.synth.speak(utterance);
  //   });
  // }


  private async setupAudioWorklet(): Promise<AudioWorkletNode> {
    const audioContext = new AudioContext();
    await audioContext.audioWorklet.addModule('assets/audioCapture.worklet.js');
    return new AudioWorkletNode(audioContext, 'audio-capture-processor');
  }

  private async textToAudioBlob(text: string, voiceSettings: any): Promise<Blob> {
    return new Promise(async (resolve) => {
      try {
        const audioContext = new AudioContext();
        const workletNode = await this.setupAudioWorklet();
        const chunks: Float32Array[] = [];

        // Connect speech synthesis to audio worklet
        const sourceNode = audioContext.createMediaStreamSource(await audioContext.createMediaStreamDestination().stream);
        sourceNode.connect(workletNode);
        workletNode.connect(audioContext.destination);

        // Collect audio data from worklet
        workletNode.port.onmessage = (event) => {
          if (event.data.samples) {
            chunks.push(new Float32Array(event.data.samples));
          }
        };

        // Create and configure utterance
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.pitch = voiceSettings.pitch;
        utterance.rate = voiceSettings.rate;
        utterance.volume = voiceSettings.volume;

        const voices = this.synth.getVoices();
        const voice = voices.find(v => v.name === voiceSettings.voice);
        if (voice) {
          utterance.voice = voice;
        }

        // Handle speech end
        utterance.onend = () => {
          setTimeout(() => {
            // Convert collected chunks to WAV format
            const wavData = this.createWAVFile(chunks, audioContext.sampleRate);
            const blob = new Blob([wavData], { type: 'audio/wav' });
            resolve(blob);
            audioContext.close();
          }, 100);
        };

        // Start speech
        this.synth.speak(utterance);
      } catch (error) {
        console.error('Audio capture error:', error);
        resolve(new Blob([], { type: 'audio/wav' }));
      }
    });
  }

  private createWAVFile(audioData: Float32Array[], sampleRate: number): ArrayBuffer {
    const numChannels = 1;
    const totalSamples = audioData.reduce((acc, curr) => acc + curr.length, 0);
    
    // WAV header calculation
    const headerSize = 44;
    const dataSize = totalSamples * 2; // 16-bit samples
    const buffer = new ArrayBuffer(headerSize + dataSize);
    const view = new DataView(buffer);

    // Write WAV header
    const writeString = (offset: number, string: string) => {
      for (let i = 0; i < string.length; i++) {
        view.setUint8(offset + i, string.charCodeAt(i));
      }
    };

    writeString(0, 'RIFF');                     // RIFF identifier
    view.setUint32(4, 36 + dataSize, true);     // File size
    writeString(8, 'WAVE');                     // WAVE identifier
    writeString(12, 'fmt ');                    // Format chunk identifier
    view.setUint32(16, 16, true);               // Format chunk length
    view.setUint16(20, 1, true);                // Sample format (1 = PCM)
    view.setUint16(22, numChannels, true);      // Number of channels
    view.setUint32(24, sampleRate, true);       // Sample rate
    view.setUint32(28, sampleRate * 2, true);   // Byte rate
    view.setUint16(32, 2, true);                // Block align
    view.setUint16(34, 16, true);               // Bits per sample
    writeString(36, 'data');                    // Data chunk identifier
    view.setUint32(40, dataSize, true);         // Data chunk length

    // Write audio data
    let offset = 44;
    for (const chunk of audioData) {
      for (let i = 0; i < chunk.length; i++) {
        const sample = Math.max(-1, Math.min(1, chunk[i]));
        view.setInt16(offset, sample * 0x7FFF, true);
        offset += 2;
      }
    }

    return buffer;
  }

  generateJson() {
    if (!this.isProcessingComplete()) return;

    const script = {
      version: "1.0",
      metadata: {
        title: this.fileName.replace('.txt', ''),
        author: "Unknown",
        processingDate: new Date().toISOString(),
        totalLines: this.scriptLines.length,
        characters: [...new Set(this.lineCharacters)]
      },
      script: this.scriptLines.map((line, index) => {
        const character = this.getCharacterById(this.lineCharacters[index]);
        return {
          id: `line_${(index + 1).toString().padStart(3, '0')}`,
          type: this.lineTypes[index],
          characterId: this.lineCharacters[index],
          text: line,
          emotion: this.lineEmotions[index],
          voiceSettings: character?.voiceSettings || {
            pitch: 1.0,
            rate: 1.0,
            voice: "Microsoft David - English (United States)"
          },
          timestamp: index * 5,
          duration: 5
        };
      })
    };

    const blob = new Blob([JSON.stringify(script, null, 2)], { type: 'application/json' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${this.fileName.replace('.txt', '')}_processed.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  }
}