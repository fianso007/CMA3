import { VoiceSettings } from "./character-mapping";

export interface ScriptLine {
  id: string;
  type: 'DIALOGUE' | 'NARRATION' | 'ACTION';
  characterId: string;
  text: string;
  emotion?: string;
  voiceSettings: VoiceSettings;
  confidence?: number;
  speakerPrefix?: string;
  timestamp: number;
  duration: number;
}

export interface ScriptMetadata {
  title: string;
  author: string;
  processingDate: string;
  totalLines: number;
  characters: string[];
}

export interface AudioMetadata {
  totalDuration: number;
  format: string;
  sampleRate: number;
  channels: number;
  bitrate: number;
}

export interface Statistics {
  dialogueCount: number;
  narrationCount: number;
  actionCount: number;
  characterLines: { [key: string]: number };
  emotionDistribution: { [key: string]: number };
}

export interface Script {
  version: string;
  metadata: ScriptMetadata;
  script: ScriptLine[];
  audioMetadata: AudioMetadata;
  statistics: Statistics;
}