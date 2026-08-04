import { Unit, Category, Stage } from "./types";

export const UNITS: Unit[] = [
  { id: "hr", name: "HR", kind: "Function" },
  { id: "fin", name: "Finance", kind: "Function" },
  { id: "cpur", name: "Central Purchase", kind: "Function" },
  { id: "cproc", name: "Central Process", kind: "Function" },
  { id: "rnd", name: "R&D", kind: "Function" },
  { id: "cq", name: "Central Quality", kind: "Function" },
  { id: "scm", name: "SCM", kind: "Function" },
  { id: "ops", name: "Operation", kind: "Function" },
  { id: "oem", name: "OE Marketing", kind: "Function" },
  { id: "pm", name: "Project Management", kind: "Function" },
  { id: "khandsa", name: "Khandsa", kind: "Plant" },
  { id: "pune", name: "Pune", kind: "Plant" },
  { id: "parwanoo", name: "Parwanoo", kind: "Plant" },
  { id: "chennai", name: "Chennai", kind: "Plant" },
];

export const CATEGORIES: Category[] = [
  {
    id: "customer",
    name: "Customer Service",
    blurb:
      "Exceptional customer outcomes — timely resolution and positive feedback, internal or external.",
  },
  {
    id: "eagle",
    name: "Eagle Eye",
    blurb:
      "Spotted a critical process gap through sharp observation and provided an effective solution.",
  },
  {
    id: "eom",
    name: "Employee of the Month",
    blurb:
      "Consistent outstanding performance, measurable results, and MAHLE values in action. Male and female winners are declared separately.",
    splitByGender: true,
  },
  {
    id: "newcomer",
    name: "Best New Comer",
    blurb:
      "A recent joiner with rapid, meaningful contribution and strong learning agility.",
  },
  {
    id: "learning",
    name: "Learning Champion",
    blurb:
      "Pursued learning, applied new skills on the job, and shared knowledge to lift team capability.",
  },
];

export const STAGES: Stage[] = [
  { id: "nomination", label: "Nominations", window: "1st – 7th" },
  { id: "validation", label: "HR validation", window: "8th – 9th" },
  { id: "judging", label: "Panel scoring", window: "10th – 12th" },
  { id: "announced", label: "Winners declared", window: "15th" },
];

export const MAX_CATEGORIES_PER_UNIT = 2;
export const PANEL_SIZE = 3;
export const PRIZE = 2000;
export const POINTS = 10;

export const catById = (id: string): Category | undefined =>
  CATEGORIES.find((c) => c.id === id);

export const unitById = (id: string): Unit | undefined =>
  UNITS.find((u) => u.id === id);
