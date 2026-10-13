export interface FoodItem {
  food_name: string;
  percent_of_total: number;
  per_100g: {
    calories_kcal: number;
    protein_g: number;
    carbs_g: number;
    fat_g: number;
  };
  alternatives: string[];   // LLM field name; stored as alternative_names in DB
  confidence: number;
}

export interface LLMVisionResponse {
  items: FoodItem[];
  error?: string;
}

export interface NormalizedFoodEntry {
  food_name: string;
  weight_g: number;
  calories_kcal: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  confidence: number | null;
  alternative_names: string[] | null;
}

export interface FoodsCache {
  food_name_normalized: string;
  calories_kcal_per_100g: number;
  protein_g_per_100g: number;
  carbs_g_per_100g: number;
  fat_g_per_100g: number;
  source: string;
}

export interface RateLimitResult {
  allowed: boolean;
  count: number;
}
