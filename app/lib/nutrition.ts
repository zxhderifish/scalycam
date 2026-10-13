export interface Profile {
  weight_kg: number;
  height_cm: number;
  age: number;
  sex: "male" | "female" | "other";
  activity_level: 1.2 | 1.4 | 1.6 | 1.8;
  goal: "lose" | "maintain" | "gain";
}

export interface Targets {
  calorieTarget: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  warning: string | null;
}

export function calculateTargets(p: Profile): Targets {
  const bmrMale = 10 * p.weight_kg + 6.25 * p.height_cm - 5 * p.age + 5;
  const bmrFemale = 10 * p.weight_kg + 6.25 * p.height_cm - 5 * p.age - 161;

  const bmr =
    p.sex === "male" ? bmrMale : p.sex === "female" ? bmrFemale : (bmrMale + bmrFemale) / 2;

  const tdee = bmr * p.activity_level;
  const adjustment = { lose: -500, maintain: 0, gain: 300 }[p.goal];

  let calorieTarget = Math.round(tdee + adjustment);
  const floor = Math.max(1200, Math.round(bmr));

  let warning: string | null = null;
  if (calorieTarget < floor) {
    warning = `Calculated target ${calorieTarget} kcal is below the recommended minimum. Raising to ${floor} kcal.`;
    calorieTarget = floor;
  }

  const proteinG = Math.round(p.weight_kg * 2.0);
  const fatG = Math.round((calorieTarget * 0.25) / 9);
  const carbsG = Math.round((calorieTarget - proteinG * 4 - fatG * 9) / 4);

  return { calorieTarget, proteinG, carbsG, fatG, warning };
}
