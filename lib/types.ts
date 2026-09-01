export type UnitKind = "Function" | "Plant";

export interface Unit {
  id: string;
  name: string;
  kind: UnitKind;
}

export interface Category {
  id: string;
  name: string;
  blurb: string;
  splitByGender?: boolean;
}

export interface Stage {
  id: string;
  label: string;
  window: string;
}

export interface Judge {
  id: string;
  name: string;
  code?: string;
  isPanelJudge?: boolean;
}

export interface Nomination {
  id: string;
  name: string;
  code: string;
  unit: string;
  category: string;
  gender: string;
  citation: string;
  businessImpact?: string;
  mafsValue?: string;
  evidence?: string;
  submittedAt: string;
  validated: boolean | null;
  hrNote?: string;
}

export interface PhaseTimeline {
  startDate: string; // YYYY-MM-DD
  endDate: string;   // YYYY-MM-DD
  isExtended?: boolean;
  extendedUntil?: string; // YYYY-MM-DD
  extendedDays?: number;
}

export interface CycleTimeline {
  nomination: PhaseTimeline;
  hodEndorsement: PhaseTimeline;
  panelScoring: PhaseTimeline;
}

export interface Cycle {
  month: string;
  stage: string;
  judges: Judge[];
  nominations: Nomination[];
  endorsed: Record<string, Record<string, string>>;
  scores: Record<string, Record<string, number>>;
  announcedAt: string | null;
  timeline?: CycleTimeline;
}

export interface Win {
  month: string;
  category: string;
  score?: number;
  isWinner?: boolean;
}

export interface PointRecord {
  name: string;
  unit: string;
  points: number;
  wins: Win[];
}

export type PointsState = Record<string, PointRecord>;

export interface Branding {
  logoUrl: string;
}

export type Role = "employee" | "hod" | "judge" | "hr" | "admin";

export interface AuthUser {
  role: Role;
  name: string;
  code?: string;
  unitId?: string;
  designation?: string;
  judgeId?: string;
  isHOD?: boolean;
  isPanelJudge?: boolean;
  isAdmin?: boolean;
  gender?: string;
}

export interface AuthSession {
  authenticated: boolean;
  user?: AuthUser;
}

export interface PanelScoreResult {
  avg: number | null;
  count: number;
  vals: number[];
}

export interface RankedNominee extends PanelScoreResult {
  nom: Nomination;
}

export interface CategoryResult {
  category: Category;
  slotLabel: string | null;
  ranked: RankedNominee[];
}

