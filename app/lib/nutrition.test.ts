import { calculateTargets, Profile } from "./nutrition";

// Invented arithmetic fixtures created for this public release; not personal records.
const syntheticProfile: Profile = {
  weight_kg: 76, height_cm: 182, age: 32, sex: "male",
  activity_level: 1.4, goal: "maintain",
};

describe("calculateTargets with synthetic profiles", () => {
  it("calculates energy and protein for a synthetic maintenance profile", () => {
    const result = calculateTargets(syntheticProfile);
    expect(result.calorieTarget).toBe(2440);
    expect(result.proteinG).toBe(152);
    expect(result.warning).toBeNull();
  });
  it("applies the energy floor for a synthetic low-weight profile", () => {
    const result = calculateTargets({ ...syntheticProfile, weight_kg: 44,
      height_cm: 152, age: 36, sex: "female", activity_level: 1.2, goal: "lose" });
    expect(result.calorieTarget).toBe(1200);
    expect(result.warning).not.toBeNull();
  });
  it("places the averaged formula between the two sex-specific formulas", () => {
    const male = calculateTargets(syntheticProfile);
    const female = calculateTargets({ ...syntheticProfile, sex: "female" });
    const other = calculateTargets({ ...syntheticProfile, sex: "other" });
    expect(other.calorieTarget).toBeGreaterThanOrEqual(female.calorieTarget);
    expect(other.calorieTarget).toBeLessThanOrEqual(male.calorieTarget);
  });
});
