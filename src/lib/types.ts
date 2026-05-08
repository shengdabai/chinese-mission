// User types
export interface User {
  id: string;
  nativeLanguage: string;
  bridgeLanguage: string;
  currentLevel: "A0" | "A1" | "A2";
  preferredMode: "text" | "voice" | "mixed";
  goal: "survival" | "social" | "work" | "travel";
  createdAt: string;
}

// Scenario & Mission types
export type ScenarioCategory = "survival" | "social" | "work" | "travel";

export interface Scenario {
  id: string;
  code: string;
  name: string;
  nameEn: string;
  category: ScenarioCategory;
  description: string;
  descriptionEn: string;
  icon: string;
  missions: Mission[];
}

export interface Mission {
  id: string;
  scenarioId: string;
  code: string;
  title: string;
  titleEn: string;
  level: "A0" | "A1" | "A2";
  objective: string;
  objectiveEn: string;
  estimatedMinutes: number;
  requiredSlots: string[];
  optionalSlots: string[];
  warmupPatterns: GlossItem[];
  states: MissionState[];
  npcPersona: NpcPersona;
}

export interface MissionState {
  code: string;
  name: string;
  nameEn: string;
  allowedNextStates: string[];
  requiredSlotsInState: string[];
  hintPolicy: { defaultLevel: number };
}

export interface NpcPersona {
  role: string;
  roleEn: string;
  style: string;
  openingLine: string;
  openingLineEn: string;
}

// Gloss types
export interface GlossItem {
  hanzi: string;
  pinyin: string;
  chunks: string[];
  gloss: string[];
  naturalEn: string;
  note?: string;
  level: "A0" | "A1" | "A2";
}

// Session & Dialogue types
export type TaskStatus =
  | "not_started"
  | "in_progress"
  | "completed"
  | "failed"
  | "partial_success";

export interface Session {
  id: string;
  missionId: string;
  status: TaskStatus;
  currentState: string;
  slotsFilledMap: Record<string, string>;
  turns: Turn[];
  hintLevel: number;
  startedAt: string;
  completedAt?: string;
}

export interface Turn {
  id: string;
  role: "user" | "npc" | "system";
  rawInput: string;
  normalizedInput?: string;
  detectedScript?: "hanzi" | "pinyin" | "mixed" | "en";
  npcReplyCn?: string;
  npcReplyEn?: string;
  understood?: boolean;
  slotsFilled?: string[];
  errorTags?: string[];
  hintUsed?: number;
  timestamp: string;
}

// Debrief types
export interface DebriefResult {
  result: "success" | "partial_success" | "failure";
  score: number;
  strengths: string[];
  topFixes: DebriefFix[];
  transferPatterns: GlossItem[];
  nextMissionId?: string;
}

export interface DebriefFix {
  type: string;
  before: string;
  after: string;
  reason: string;
}

// Phrasebook types
export interface PhrasebookItem {
  id: string;
  textCn: string;
  gloss: GlossItem;
  sourceMissionId: string;
  masteryScore: number;
  savedAt: string;
}

// User Skill Profile
export interface UserSkillProfile {
  sceneStrengths: Record<string, number>;
  intentAbilities: Record<string, number>;
  patternsMastered: string[];
  commonErrors: ErrorPattern[];
  glossDependency: "high" | "medium" | "low";
  overallLevel: "A0" | "A1" | "A2";
}

export interface ErrorPattern {
  type: string;
  description: string;
  frequency: number;
  severity: number;
}

// Hint types
export interface HintContent {
  level: number;
  keywords?: string[];
  glossHint?: GlossItem;
  halfSentence?: string;
  fullReference?: string;
}
