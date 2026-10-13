import { assertEquals } from "https://deno.land/std@0.208.0/assert/mod.ts";
import { normalizeFood } from "./normalize.ts";

// Synthetic string-processing examples, not meal records.
Deno.test("lowercases synthetic labels", () => {
  assertEquals(normalizeFood("Synthetic Item"), "synthetic item");
});
Deno.test("strips punctuation", () => {
  assertEquals(normalizeFood("Item (synthetic)"), "item synthetic");
});
Deno.test("normalizes fullwidth characters", () => {
  assertEquals(normalizeFood("Ｉtem"), "item");
});
Deno.test("collapses spaces", () => {
  assertEquals(normalizeFood("  test   item  "), "test item");
});
