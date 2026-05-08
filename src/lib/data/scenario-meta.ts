/**
 * Lightweight scenario metadata for client-side use.
 * Contains only the data needed for progress tracking — no full Mission objects.
 * Kept separate from scenarios.ts so client pages don't share a module graph
 * with API routes (which import scenarios.ts), preventing Fast Refresh full reloads.
 */

export interface ScenarioMeta {
  nameEn: string;
  missionIds: string[];
}

export const scenarioMeta: ScenarioMeta[] = [
  {
    nameEn: "Cafe & Restaurant",
    missionIds: ["m1", "m2", "m3", "m4"],
  },
  {
    nameEn: "Taxi & Transport",
    missionIds: ["m5", "m6", "m7"],
  },
  {
    nameEn: "Ask Directions",
    missionIds: ["m8", "m9", "m10"],
  },
  {
    nameEn: "Self Introduction",
    missionIds: ["m11", "m12", "m13"],
  },
  {
    nameEn: "Making Friends",
    missionIds: ["m14", "m15", "m16"],
  },
  {
    nameEn: "Work Basics",
    missionIds: ["m17", "m18", "m19", "m20"],
  },
];
