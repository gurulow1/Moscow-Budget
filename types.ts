export type Persona = "Student" | "Professional" | "Entrepreneur" | "Family";

export interface DashboardState {
  balance: number;
  persona: Persona;
  calculatorTaskCompleted: boolean;
  earnedPoints: number | null; // For the floating animation
}
