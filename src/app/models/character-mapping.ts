export interface VoiceSettings {
  pitch: number;
  rate: number;
  voice: string;
  volume: number;
}

export interface CharacterMapping {
  id: string;
  name: string;
  patterns: string[];
  defaultEmotion: string;
  voiceSettings: VoiceSettings;
}

export interface CharacterMappings {
  version: string;
  mappings: CharacterMapping[];
}