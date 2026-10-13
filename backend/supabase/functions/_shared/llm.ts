import Anthropic from "npm:@anthropic-ai/sdk";
import { LLMVisionResponse, NormalizedFoodEntry } from "./types.ts";

const VISION_MODEL = "claude-sonnet-4-6";
const TEXT_MODEL = "claude-haiku-4-5-20251001";  // cheaper for text-only lookups
const MAX_RETRIES = 3;
const BACKOFF_MS = [1000, 4000, 16000];

const recognizeMealPromptTemplate = await Deno.readTextFile(
  new URL("../../../prompts/recognize_meal.md", import.meta.url)
).catch(() => RECOGNIZE_MEAL_PROMPT_INLINE);

const textNutritionPromptTemplate = await Deno.readTextFile(
  new URL("../../../prompts/text_nutrition.md", import.meta.url)
).catch(() => TEXT_NUTRITION_PROMPT_INLINE);

// Inline fallbacks in case file reads fail in deployed environment
const RECOGNIZE_MEAL_PROMPT_INLINE = `You are a nutritionist. Analyze the food in the image. The total weight on the plate is {weight_g} grams.

Tasks:
1. Identify every distinct food visible in the image.
2. Estimate each food's share of the total weight as a percentage.
3. Provide per-100 g nutrition (calories, protein, carbs, fat) for each food.
4. Provide up to 2 plausible alternative names per food for one-tap correction (match the language the user used in the request; default to English).
5. Provide an overall confidence value 0.0–1.0.

Constraints:
- At most 6 items. Merge near-identical items.
- Percentages must sum to 100.
- If you cannot identify food in the image, return { "items": [], "error": "..." }.

Return JSON only, no commentary:
{
  "items": [
    {
      "food_name": "white rice",
      "percent_of_total": 40,
      "per_100g": { "calories_kcal": 130, "protein_g": 2.7, "carbs_g": 28, "fat_g": 0.3 },
      "alternatives": ["brown rice", "fried rice"],
      "confidence": 0.92
    }
  ]
}`;

const TEXT_NUTRITION_PROMPT_INLINE = `Provide per-100 g nutrition for {food_name} as JSON, no commentary:
{"calories_kcal": number, "protein_g": number, "carbs_g": number, "fat_g": number}`;

function getClient(): Anthropic {
  return new Anthropic({ apiKey: Deno.env.get("ANTHROPIC_API_KEY") });
}

async function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

export async function callClaudeVision(
  imageBase64: string,
  weightG: number,
  hintText?: string
): Promise<LLMVisionResponse> {
  const client = getClient();
  const prompt = recognizeMealPromptTemplate.replace("{weight_g}", String(weightG)) +
    (hintText ? `\n\nUser hint: ${hintText}. Trust this hint over visual cues if they conflict.` : "");

  let lastError: Error | null = null;
  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      const message = await client.messages.create({
        model: VISION_MODEL,
        max_tokens: 1024,
        messages: [{
          role: "user",
          content: [
            { type: "image", source: { type: "base64", media_type: "image/jpeg", data: imageBase64 } },
            { type: "text", text: prompt },
          ],
        }],
      });
      const text = message.content.find((c) => c.type === "text")?.text ?? "";
      const parsed = JSON.parse(text) as LLMVisionResponse;
      return parsed;
    } catch (err) {
      lastError = err as Error;
      const isRetryable = (err as { status?: number }).status === 429 ||
                          (err as { status?: number }).status === 503;
      if (!isRetryable || attempt === MAX_RETRIES - 1) break;
      await sleep(BACKOFF_MS[attempt]);
    }
  }
  throw lastError ?? new Error("LLM call failed");
}

export async function callClaudeText(foodName: string): Promise<{
  calories_kcal: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
}> {
  const client = getClient();
  const prompt = textNutritionPromptTemplate.replace("{food_name}", foodName);

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      const message = await client.messages.create({
        model: TEXT_MODEL,
        max_tokens: 256,
        messages: [{ role: "user", content: prompt }],
      });
      const text = message.content.find((c) => c.type === "text")?.text ?? "";
      return JSON.parse(text);
    } catch (err) {
      const isRetryable = (err as { status?: number }).status === 429 ||
                          (err as { status?: number }).status === 503;
      if (!isRetryable || attempt === MAX_RETRIES - 1) throw err;
      await sleep(BACKOFF_MS[attempt]);
    }
  }
  throw new Error("LLM text call failed");
}

export function validateAndNormalizeItems(
  response: LLMVisionResponse,
  totalWeightG: number
): NormalizedFoodEntry[] | null {
  if (!response.items || response.items.length === 0) return null;
  if (response.items.length > 6) return null;

  const sum = response.items.reduce((s, i) => s + i.percent_of_total, 0);
  if (Math.abs(sum - 100) > 10) return null;

  // Normalize percentages to exactly 100
  const factor = 100 / sum;
  return response.items.map((item) => {
    const pct = item.percent_of_total * factor;
    const weightG = (totalWeightG * pct) / 100;
    return {
      food_name: item.food_name,
      weight_g: Math.round(weightG * 10) / 10,
      calories_kcal: Math.round((weightG / 100) * item.per_100g.calories_kcal * 10) / 10,
      protein_g: Math.round((weightG / 100) * item.per_100g.protein_g * 10) / 10,
      carbs_g: Math.round((weightG / 100) * item.per_100g.carbs_g * 10) / 10,
      fat_g: Math.round((weightG / 100) * item.per_100g.fat_g * 10) / 10,
      confidence: item.confidence ?? null,
      alternative_names: item.alternatives ?? null,
    };
  });
}

export async function logLLMCall(
  adminClient: import("npm:@supabase/supabase-js@2").SupabaseClient,
  params: {
    user_id?: string;
    meal_id?: string;
    endpoint: string;
    model: string;
    input_tokens?: number;
    output_tokens?: number;
    cost_usd?: number;
    latency_ms?: number;
    status: string;
  }
): Promise<void> {
  await adminClient.from("llm_call_log").insert(params);
}
