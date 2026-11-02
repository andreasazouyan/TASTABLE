/**
 * Fictional demo personas, modelled on Tastable's audience: New Yorkers aged roughly 20–35.
 * Shown on the demo sign-in screen so testers know who they're "being". Not real people.
 */
export type Persona = { userId: string; age: number; summary: string; budget: string };

export const PERSONAS: Persona[] = [
  {
    userId: "usr_zoe",
    age: 24,
    summary: "Master's student in the East Village. Loves unique, stylish nights out with friends.",
    budget: "Low budget: under $60 a seat",
  },
  {
    userId: "usr_jordan",
    age: 30,
    summary: "Working professional in Williamsburg. Wants to learn new cooking skills and meet people.",
    budget: "Medium budget: up to $100",
  },
  {
    userId: "usr_sofia",
    age: 34,
    summary: "Into beautiful spaces and decor. Follows food creator Priya Raman and will pay for her events.",
    budget: "High budget: no limit",
  },
  {
    userId: "usr_alex",
    age: 27,
    summary: "Just moved to New York. Hasn't set preferences yet: try onboarding from scratch.",
    budget: "Not set",
  },
];

export const PERSONA_IDS = PERSONAS.map((p) => p.userId);
export const getPersona = (userId: string) => PERSONAS.find((p) => p.userId === userId);
