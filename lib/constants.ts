import { Unit, Category, Stage } from "./types";

export const UNITS: Unit[] = [
  // Plants
  { id: "PUNE", name: "PUNE", kind: "Plant" },
  { id: "CHENNAI", name: "CHENNAI", kind: "Plant" },
  { id: "KHANDSA", name: "KHANDSA", kind: "Plant" },
  { id: "PARWANOO", name: "PARWANOO", kind: "Plant" },
  
  // Functions (HO)
  { id: "HR", name: "HR", kind: "Function" },
  { id: "Finance & IT", name: "Finance & IT", kind: "Function" },
  { id: "SCM", name: "SCM", kind: "Function" },
  { id: "Central Quality", name: "Central Quality", kind: "Function" },
  { id: "General Management & Operations", name: "General Management & Operations", kind: "Function" },
  { id: "Sales & Applications", name: "Sales & Applications", kind: "Function" },
  { id: "R&D", name: "R&D", kind: "Function" },
  { id: "Central Purchase", name: "Central Purchase", kind: "Function" },
  { id: "After Market", name: "After Market", kind: "Function" },
  { id: "Central Process", name: "Central Process", kind: "Function" },
  { id: "Problem Solving", name: "Problem Solving", kind: "Function" }
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
  { id: "validation", label: "HOD validation", window: "8th – 9th" },
  { id: "judging", label: "Panel scoring", window: "10th – 12th" },
  { id: "announced", label: "Winners declared", window: "15th" },
];

export const MAX_CATEGORIES_PER_FUNCTION = 2;
export const MAX_CATEGORIES_PER_PLANT = 4;
export const MAX_CATEGORIES_PER_UNIT = 2;
export const PANEL_SIZE = 3;
export const POINTS = 10;

export const catById = (id: string): Category | undefined =>
  CATEGORIES.find((c) => c.id === id);

export const unitById = (id: string): Unit => {
  if (!id) return { id: "", name: "N/A", kind: "Department" };
  const found = UNITS.find((u) => u.id.toLowerCase() === id.toLowerCase());
  if (found) return found;
  return {
    id: id,
    name: id, // Exact text from Database
    kind: "Department",
  };
};

export function getDynamicUnits(allEmployees: { unitId?: string }[] = []): Unit[] {
  // Enforce strictly the official main departments list (Plants + Functions)
  return UNITS;
}

export function getMaxCategoriesForUnit(unitId?: string): number {
  if (!unitId) return 2;
  const unit = unitById(unitId);
  return unit.kind === "Plant" ? 4 : 2;
}
