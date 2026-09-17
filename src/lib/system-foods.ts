// ─── System Food Database (Phase 1B) ──────────────────────────────────────────
// Curated starter dataset focused on common Indian foods. Data only — no
// storage access, no JSX. Seeding/validation live in services/nutrition.ts.
//
// DATA SOURCES (honest labeling per record via `sourceDetail`):
// - "USDA" = USDA FoodData Central, SR Legacy, per 100 g (or per stated
//   reference). Values are standard published figures rounded to 1 decimal.
// - "EST"  = Estimated from typical Indian home-recipe composition
//   (proportions consistent with ICMR-NIN Indian Food Composition Tables
//   methodology). These are reasonable defaults, NOT laboratory figures —
//   never presented as authoritative.
// Every record carries its own sourceDetail so the provenance travels with
// the food even if this file changes.
//
// RAW VS COOKED: raw and cooked variants are fully independent records with
// independent profiles. No raw↔cooked conversion exists anywhere in 1B.

import type { CreateFoodInput, FoodSource, Micronutrients } from '@/types/nutrition';
import { SYSTEM_FOODS_3T14 } from './system-foods-3t14';

export interface SystemFoodDef extends CreateFoodInput {
  /** Deterministic stable ID (`food_sys_<slug>`) — seeding stays idempotent. */
  id: string;
  source: FoodSource;
  sourceDetail: string;
}

const USDA = 'USDA FoodData Central, SR Legacy (per 100 g)';
const USDA_ML = 'USDA FoodData Central, SR Legacy (per 100 ml)';
const USDA_PC = 'USDA FoodData Central, SR Legacy (per piece)';
const EST = 'Estimated from typical Indian home-recipe composition';

function g100(
  id: string,
  name: string,
  category: string,
  preparation: SystemFoodDef['preparation'],
  sourceDetail: string,
  n: {
    calories: number; protein: number; carbohydrates: number; fat: number;
    fiber?: number; sugar?: number; saturatedFat?: number; sodium?: number;
    micronutrients?: Micronutrients;
    monounsaturatedFat?: number;
    polyunsaturatedFat?: number;
    transFat?: number;
  },
  description?: string,
  quantityConversions?: SystemFoodDef['quantityConversions'],
  aliases?: string[],
): SystemFoodDef {
  return {
    id,
    name,
    ...(aliases ? { aliases } : {}),
    category,
    preparation,
    source: 'system',
    sourceDetail,
    description: description ?? null,
    brand: null,
    serving: { amount: 100, unit: 'g' },
    nutrition: {
      basis: 'per_100g',
      calories: n.calories,
      protein: n.protein,
      carbohydrates: n.carbohydrates,
      fat: n.fat,
      fiber: n.fiber ?? 0,
      sugar: n.sugar ?? 0,
      saturatedFat: n.saturatedFat ?? 0,
      sodium: n.sodium ?? 0,
      ...(n.monounsaturatedFat !== undefined ? { monounsaturatedFat: n.monounsaturatedFat } : {}),
      ...(n.polyunsaturatedFat !== undefined ? { polyunsaturatedFat: n.polyunsaturatedFat } : {}),
      ...(n.transFat !== undefined ? { transFat: n.transFat } : {}),
      micronutrients: n.micronutrients ?? {},
    },
    ...(quantityConversions ? { quantityConversions } : {}),
  };
}

export const SYSTEM_FOODS: SystemFoodDef[] = [
  // ─── Grains & Carbs ───────────────────────────────────────────────────────
  g100('food_sys_white-rice-raw', 'White Rice, Raw', 'Grains', 'raw', USDA,
    { calories: 365, protein: 7.1, carbohydrates: 80, fat: 0.7, fiber: 1.3, sugar: 0.1, saturatedFat: 0.2, sodium: 5 },
    'Uncooked milled white rice.'),
  g100('food_sys_white-rice-cooked', 'White Rice, Cooked', 'Grains', 'cooked', USDA,
    { calories: 130, protein: 2.7, carbohydrates: 28, fat: 0.3, fiber: 0.4, sugar: 0.1, saturatedFat: 0.1, sodium: 1 },
    'Boiled/steamed white rice, unsalted.',
    { cup: 158, bowl: 200 }),
  g100('food_sys_basmati-rice-raw', 'Basmati Rice, Raw', 'Grains', 'raw', USDA,
    { calories: 365, protein: 7.5, carbohydrates: 80, fat: 0.6, fiber: 1, sugar: 0.1, saturatedFat: 0.2, sodium: 5 },
    'Uncooked basmati rice.'),
  g100('food_sys_basmati-rice-cooked', 'Basmati Rice, Cooked', 'Grains', 'cooked', EST,
    { calories: 121, protein: 2.5, carbohydrates: 26, fat: 0.4, fiber: 0.4, sugar: 0.1, saturatedFat: 0.1, sodium: 1 },
    'Boiled basmati rice, unsalted.'),
  g100('food_sys_brown-rice-cooked', 'Brown Rice, Cooked', 'Grains', 'cooked', EST,
    { calories: 123, protein: 2.7, carbohydrates: 25.6, fat: 1, fiber: 1.6, sugar: 0.4, saturatedFat: 0.2, sodium: 2 },
    'Boiled brown rice, unsalted.'),
  g100('food_sys_roti-chapati', 'Roti / Chapati', 'Grains', 'cooked', EST,
    { calories: 265, protein: 9, carbohydrates: 52, fat: 4, fiber: 7, sugar: 0.5, saturatedFat: 0.6, sodium: 200 },
    'Whole-wheat flatbread, dry-roasted without ghee. Also listed as chapati.',
    { piece: 40 }),
  g100('food_sys_paratha', 'Paratha, Plain', 'Grains', 'fried', EST,
    { calories: 290, protein: 7, carbohydrates: 45, fat: 10, fiber: 5, sugar: 0.5, saturatedFat: 3, sodium: 250 },
    'Whole-wheat flatbread shallow-fried with a little oil.'),
  g100('food_sys_poha-cooked', 'Poha, Cooked', 'Grains', 'cooked', EST,
    { calories: 130, protein: 2.5, carbohydrates: 27, fat: 1.5, fiber: 1, sugar: 0.5, saturatedFat: 0.4, sodium: 150 },
    'Flattened rice tempered with turmeric, mustard seeds and curry leaves.'),
  g100('food_sys_oats-raw', 'Oats, Raw', 'Grains', 'raw', USDA,
    { calories: 389, protein: 16.9, carbohydrates: 66.3, fat: 6.9, fiber: 10.6, sugar: 0, saturatedFat: 1.2, sodium: 2 },
    'Dry rolled oats.'),

  // ─── Protein ──────────────────────────────────────────────────────────────
  {
    id: 'food_sys_egg-whole',
    name: 'Egg, Whole',
    category: 'Protein',
    preparation: 'raw',
    source: 'system',
    sourceDetail: USDA_PC,
    description: 'One large hen egg (~50 g), raw.',
    brand: null,
    serving: { amount: 1, unit: 'piece' },
    nutrition: {
      basis: 'per_serving', servingAmount: 1, servingUnit: 'piece',
      calories: 72, protein: 6.3, carbohydrates: 0.4, fat: 5,
      fiber: 0, sugar: 0.2, saturatedFat: 1.6, sodium: 71, micronutrients: {},
    },
  },
  g100('food_sys_egg-white', 'Egg White', 'Protein', 'raw', USDA,
    { calories: 52, protein: 10.9, carbohydrates: 0.7, fat: 0.2, fiber: 0, sugar: 0.7, saturatedFat: 0, sodium: 166 },
    'Raw egg white (albumen).'),
  g100('food_sys_chicken-breast-cooked', 'Chicken Breast, Cooked', 'Protein', 'cooked', USDA,
    { calories: 165, protein: 31, carbohydrates: 0, fat: 3.6, fiber: 0, sugar: 0, saturatedFat: 1, sodium: 74 },
    'Skinless chicken breast, roasted/grilled without added fat.'),
  g100('food_sys_chicken-breast-raw', 'Chicken Breast, Raw', 'Protein', 'raw', USDA,
    { calories: 120, protein: 22.5, carbohydrates: 0, fat: 2.6, fiber: 0, sugar: 0, saturatedFat: 0.7, sodium: 73 },
    'Skinless raw chicken breast.'),
  g100('food_sys_fish-rohu-cooked', 'Fish (Rohu), Cooked', 'Protein', 'cooked', EST,
    { calories: 110, protein: 18, carbohydrates: 0, fat: 4, fiber: 0, sugar: 0, saturatedFat: 1, sodium: 60 },
    'Rohu fish, pan-cooked with minimal oil and spices.'),
  g100('food_sys_paneer', 'Paneer', 'Protein', 'other', EST,
    { calories: 265, protein: 18.2, carbohydrates: 3.6, fat: 20.1, fiber: 0, sugar: 3.6, saturatedFat: 12.5, sodium: 18 },
    'Fresh Indian cottage cheese from whole milk.'),
  g100('food_sys_tofu', 'Tofu, Firm', 'Protein', 'other', USDA,
    { calories: 76, protein: 8, carbohydrates: 1.9, fat: 4.8, fiber: 0.3, sugar: 0.6, saturatedFat: 0.7, sodium: 7 },
    'Firm tofu, calcium-set.'),
  g100('food_sys_soya-chunks-dry', 'Soya Chunks, Dry', 'Protein', 'raw', EST,
    { calories: 345, protein: 52, carbohydrates: 33, fat: 0.5, fiber: 13, sugar: 5, saturatedFat: 0.1, sodium: 50 },
    'Dehydrated soy chunks before soaking/cooking.'),
  g100('food_sys_toor-dal-raw', 'Toor Dal, Raw', 'Protein', 'raw', EST,
    { calories: 343, protein: 22.3, carbohydrates: 62.8, fat: 1.5, fiber: 15, sugar: 3, saturatedFat: 0.4, sodium: 10 },
    'Dry pigeon-pea lentils.'),
  g100('food_sys_rajma-raw', 'Rajma (Kidney Beans), Raw', 'Protein', 'raw', USDA,
    { calories: 333, protein: 23.4, carbohydrates: 60, fat: 0.8, fiber: 24.9, sugar: 2.1, saturatedFat: 0.1, sodium: 12 },
    'Dry red kidney beans.'),
  g100('food_sys_chana-raw', 'Chana (Chickpeas), Raw', 'Protein', 'raw', USDA,
    { calories: 364, protein: 19.3, carbohydrates: 60.7, fat: 6, fiber: 17.4, sugar: 10.7, saturatedFat: 0.6, sodium: 24 },
    'Dry kabuli chana (white chickpeas).'),
  {
    id: 'food_sys_milk-cow',
    name: 'Milk, Cow',
    category: 'Protein',
    preparation: 'other',
    source: 'system',
    sourceDetail: USDA_ML,
    description: 'Whole cow milk.',
    brand: null,
    serving: { amount: 100, unit: 'ml' },
    nutrition: {
      basis: 'per_100ml',
      calories: 61, protein: 3.2, carbohydrates: 4.8, fat: 3.3,
      fiber: 0, sugar: 4.8, saturatedFat: 1.9, sodium: 43,
      micronutrients: { calcium: 113 },
    },
  },
  g100('food_sys_curd-plain', 'Curd / Yogurt, Plain', 'Protein', 'other', EST,
    { calories: 62, protein: 3.1, carbohydrates: 4, fat: 3.3, fiber: 0, sugar: 4, saturatedFat: 2, sodium: 50, micronutrients: { calcium: 110 } },
    'Plain set curd from whole milk.'),

  // ─── Fruits ───────────────────────────────────────────────────────────────
  g100('food_sys_banana', 'Banana', 'Fruits', 'raw', USDA,
    { calories: 89, protein: 1.1, carbohydrates: 22.8, fat: 0.3, fiber: 2.6, sugar: 12.2, saturatedFat: 0.1, sodium: 1, micronutrients: { potassium: 358 } },
    'Ripe banana, peeled.',
    { piece: 118 }),
  g100('food_sys_apple', 'Apple', 'Fruits', 'raw', USDA,
    { calories: 52, protein: 0.3, carbohydrates: 13.8, fat: 0.2, fiber: 2.4, sugar: 10.4, saturatedFat: 0, sodium: 1 },
    'Raw apple with skin.'),
  g100('food_sys_mango', 'Mango', 'Fruits', 'raw', USDA,
    { calories: 60, protein: 0.8, carbohydrates: 15, fat: 0.4, fiber: 1.6, sugar: 13.7, saturatedFat: 0.1, sodium: 1 },
    'Ripe mango flesh.'),
  g100('food_sys_orange', 'Orange', 'Fruits', 'raw', USDA,
    { calories: 47, protein: 0.9, carbohydrates: 11.8, fat: 0.1, fiber: 2.4, sugar: 9.4, saturatedFat: 0, sodium: 0, micronutrients: { vitaminC: 53.2 } },
    'Peeled orange.'),
  g100('food_sys_guava', 'Guava', 'Fruits', 'raw', USDA,
    { calories: 68, protein: 2.6, carbohydrates: 14.3, fat: 1, fiber: 5.4, sugar: 9, saturatedFat: 0.3, sodium: 2 },
    'Common guava, raw.'),
  g100('food_sys_papaya', 'Papaya', 'Fruits', 'raw', USDA,
    { calories: 43, protein: 0.5, carbohydrates: 10.8, fat: 0.3, fiber: 1.7, sugar: 7.8, saturatedFat: 0.1, sodium: 8 },
    'Ripe papaya flesh.'),

  // ─── Vegetables ───────────────────────────────────────────────────────────
  g100('food_sys_potato-raw', 'Potato, Raw', 'Vegetables', 'raw', USDA,
    { calories: 77, protein: 2, carbohydrates: 17.5, fat: 0.1, fiber: 2.2, sugar: 0.8, saturatedFat: 0, sodium: 6 },
    'Raw potato flesh.'),
  g100('food_sys_tomato', 'Tomato', 'Vegetables', 'raw', USDA,
    { calories: 18, protein: 0.9, carbohydrates: 3.9, fat: 0.2, fiber: 1.2, sugar: 2.6, saturatedFat: 0, sodium: 5 },
    'Raw red tomato.'),
  g100('food_sys_onion', 'Onion', 'Vegetables', 'raw', USDA,
    { calories: 40, protein: 1.1, carbohydrates: 9.3, fat: 0.1, fiber: 1.7, sugar: 4.2, saturatedFat: 0, sodium: 4 },
    'Raw onion.'),
  g100('food_sys_spinach-raw', 'Spinach, Raw', 'Vegetables', 'raw', USDA,
    { calories: 23, protein: 2.9, carbohydrates: 3.6, fat: 0.4, fiber: 2.2, sugar: 0.4, saturatedFat: 0.1, sodium: 79, micronutrients: { iron: 2.7 } },
    'Raw spinach leaves.'),
  g100('food_sys_carrot', 'Carrot', 'Vegetables', 'raw', USDA,
    { calories: 41, protein: 0.9, carbohydrates: 9.6, fat: 0.2, fiber: 2.8, sugar: 4.7, saturatedFat: 0, sodium: 69 },
    'Raw carrot.'),
  g100('food_sys_broccoli', 'Broccoli', 'Vegetables', 'raw', USDA,
    { calories: 34, protein: 2.8, carbohydrates: 6.6, fat: 0.4, fiber: 2.6, sugar: 1.7, saturatedFat: 0.1, sodium: 33 },
    'Raw broccoli.'),

  // ─── Common Indian Dishes ──────────────────────────────────────────────────
  g100('food_sys_idli', 'Idli', 'Indian Dishes', 'steamed', EST,
    { calories: 150, protein: 4.5, carbohydrates: 30, fat: 1, fiber: 1.5, sugar: 0.5, saturatedFat: 0.3, sodium: 200 },
    'Steamed fermented rice-lentil cakes.'),
  g100('food_sys_dosa-plain', 'Dosa, Plain', 'Indian Dishes', 'fried', EST,
    { calories: 170, protein: 4, carbohydrates: 32, fat: 4, fiber: 1.5, sugar: 0.5, saturatedFat: 1, sodium: 220 },
    'Thin fermented crepe, griddled with a little oil.'),
  g100('food_sys_sambar', 'Sambar', 'Indian Dishes', 'boiled', EST,
    { calories: 55, protein: 2.5, carbohydrates: 8, fat: 1.5, fiber: 2, sugar: 2, saturatedFat: 0.4, sodium: 250 },
    'Lentil-vegetable stew with tamarind.'),
  g100('food_sys_khichdi', 'Khichdi', 'Indian Dishes', 'boiled', EST,
    { calories: 120, protein: 4, carbohydrates: 22, fat: 2, fiber: 2, sugar: 0.5, saturatedFat: 0.8, sodium: 200 },
    'Soft-cooked rice and moong dal with turmeric.'),
  g100('food_sys_dal-cooked', 'Dal, Cooked (Tadka)', 'Indian Dishes', 'cooked', EST,
    { calories: 115, protein: 6, carbohydrates: 17, fat: 3, fiber: 4, sugar: 1, saturatedFat: 1, sodium: 250 },
    'Cooked lentils tempered with spices.'),
  g100('food_sys_dal-rice-cooked', 'Cooked Dal Rice', 'Indian Dishes', 'cooked', EST,
    { calories: 130, protein: 4.5, carbohydrates: 25, fat: 1.5, fiber: 2, sugar: 0.5, saturatedFat: 0.5, sodium: 180 },
    'Home-style mixed cooked dal and rice.'),

  // ─── Cooking Essentials ───────────────────────────────────────────────────
  g100('food_sys_cooking-oil', 'Cooking Oil, Refined', 'Essentials', 'other', USDA,
    { calories: 884, protein: 0, carbohydrates: 0, fat: 100, fiber: 0, sugar: 0, saturatedFat: 14, sodium: 0 },
    'Refined vegetable oil.'),
  g100('food_sys_ghee', 'Ghee', 'Essentials', 'other', EST,
    { calories: 876, protein: 0.3, carbohydrates: 0, fat: 99.5, fiber: 0, sugar: 0, saturatedFat: 62, sodium: 0 },
    'Clarified butter.'),
  g100('food_sys_butter', 'Butter, Unsalted', 'Essentials', 'other', USDA,
    { calories: 717, protein: 0.9, carbohydrates: 0.1, fat: 81.1, fiber: 0, sugar: 0.1, saturatedFat: 51.4, sodium: 11 },
    'Unsalted butter.'),
  g100('food_sys_sugar', 'Sugar, White', 'Essentials', 'other', USDA,
    { calories: 387, protein: 0, carbohydrates: 100, fat: 0, fiber: 0, sugar: 99.8, saturatedFat: 0, sodium: 0 },
    'Granulated white sugar.'),
  g100('food_sys_salt', 'Salt', 'Essentials', 'other', USDA,
    { calories: 0, protein: 0, carbohydrates: 0, fat: 0, fiber: 0, sugar: 0, saturatedFat: 0, sodium: 38758 },
    'Table salt. Sodium is the tracked nutrient here.'),
  ...SYSTEM_FOODS_3T14,
];

/** Distinct categories present in the dataset, alphabetical. */
export const SYSTEM_FOOD_CATEGORIES: string[] = Array.from(
  new Set(
    SYSTEM_FOODS.map((f) => (f.category ?? '').trim()).filter((c) => c !== ''),
  ),
).sort((a, b) => a.localeCompare(b));
