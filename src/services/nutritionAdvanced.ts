import { loadData, saveData } from '@/lib/storage';
import { uid } from '@/lib/uid';
import { getFoodLogs, getFoods, getRecipes, createFoodLog } from '@/services/nutrition';
import type { FoodItem, FoodLogEntry, Recipe, MealType, ServingUnit } from '@/types/nutrition';

export interface ServingPreset { id:string; foodId:string; name:string; amount:number; unit:ServingUnit; createdAt:string; updatedAt:string; }
export interface MealTemplateItem { foodId:string; quantity:number; unit:ServingUnit; itemType?:'food'|'recipe'; }
export interface MealTemplate { id:string; name:string; mealType:MealType; items:MealTemplateItem[]; createdAt:string; updatedAt:string; }
export interface NutritionPreferences { favoriteFoodIds:string[]; recentFoodIds:string[]; }
export interface NutritionDatasetVersion { version:string; source:string; importedAt:string; foodCount:number; checksum?:string; }

const PREF_KEY='jeevya:nutrition:prefs:v2';
const PRESET_KEY='jeevya:nutrition:serving-presets:v1';
const TEMPLATE_KEY='jeevya:nutrition:meal-templates:v1';
const VERSION_KEY='jeevya:nutrition:dataset-version:v1';

async function prefs():Promise<NutritionPreferences>{return loadData(PREF_KEY,{favoriteFoodIds:[],recentFoodIds:[]});}
async function savePrefs(p:NutritionPreferences){await saveData(PREF_KEY,p);}
export async function getNutritionPreferences(){return prefs();}
export async function isFavoriteFood(id:string){return (await prefs()).favoriteFoodIds.includes(id);}
export async function toggleFavoriteFood(id:string){const p=await prefs();p.favoriteFoodIds=p.favoriteFoodIds.includes(id)?p.favoriteFoodIds.filter(x=>x!==id):[...p.favoriteFoodIds,id];await savePrefs(p);return p.favoriteFoodIds.includes(id);}
export async function recordRecentFood(id:string){const p=await prefs();p.recentFoodIds=[id,...p.recentFoodIds.filter(x=>x!==id)].slice(0,20);await savePrefs(p);}
export async function getRecentFoods():Promise<FoodItem[]>{const [p,foods]=await Promise.all([prefs(),getFoods()]);const m=new Map(foods.map(f=>[f.id,f]));return p.recentFoodIds.map(id=>m.get(id)).filter((x):x is FoodItem=>!!x);}
export async function getFavoriteFoods():Promise<FoodItem[]>{const [p,foods]=await Promise.all([prefs(),getFoods()]);const m=new Map(foods.map(f=>[f.id,f]));return p.favoriteFoodIds.map(id=>m.get(id)).filter((x):x is FoodItem=>!!x);}

export async function getServingPresets(foodId?:string){const all=await loadData<ServingPreset[]>(PRESET_KEY,[]);return foodId?all.filter(x=>x.foodId===foodId):all;}
export async function saveServingPreset(input:Omit<ServingPreset,'id'|'createdAt'|'updatedAt'>){const all=await loadData<ServingPreset[]>(PRESET_KEY,[]);const now=new Date().toISOString();const out={...input,id:uid(),createdAt:now,updatedAt:now};await saveData(PRESET_KEY,[out,...all]);return out;}
export async function deleteServingPreset(id:string){const all=await loadData<ServingPreset[]>(PRESET_KEY,[]);await saveData(PRESET_KEY,all.filter(x=>x.id!==id));}

export async function getMealTemplates(){return loadData<MealTemplate[]>(TEMPLATE_KEY,[]);}
export async function saveMealTemplate(input:Omit<MealTemplate,'id'|'createdAt'|'updatedAt'>){const all=await getMealTemplates();const now=new Date().toISOString();const out={...input,id:uid(),createdAt:now,updatedAt:now};await saveData(TEMPLATE_KEY,[out,...all]);return out;}
export async function deleteMealTemplate(id:string){const all=await getMealTemplates();await saveData(TEMPLATE_KEY,all.filter(x=>x.id!==id));}
export async function repeatFoodLog(log:FoodLogEntry,date:string,quantity=log.quantity){return createFoodLog({foodId:log.foodId,quantity,unit:log.unit,mealType:log.mealType,date,itemType:log.itemType});}
export async function repeatMeal(date:string,mealType:MealType,sourceDate:string){const [logs]=await Promise.all([getFoodLogs()]);const source=logs.filter(x=>x.date===sourceDate&&x.mealType===mealType);const created=[];for(const log of source)created.push(await repeatFoodLog(log,date));return created;}
export async function applyMealTemplate(template:MealTemplate,date:string){const created=[];for(const item of template.items)created.push(await createFoodLog({foodId:item.foodId,quantity:item.quantity,unit:item.unit,mealType:template.mealType,date,itemType:item.itemType}));return created;}

export async function getNutritionDatasetVersion():Promise<NutritionDatasetVersion|null>{return loadData<NutritionDatasetVersion|null>(VERSION_KEY,null);}
export async function setNutritionDatasetVersion(version:string,source:string,foodCount:number,checksum?:string){const out={version,source,foodCount,checksum,importedAt:new Date().toISOString()};await saveData(VERSION_KEY,out);return out;}

export interface WeeklyNutritionAdherence { days:number; loggedDays:number; targetDays:number; adherencePercent:number|null; averageCalories:number|null; averageProtein:number|null; }
export async function calculateWeeklyNutritionAdherence(endDate:string):Promise<WeeklyNutritionAdherence>{
 const [logs,foods]=await Promise.all([getFoodLogs(),getFoods()]); const map=new Map(foods.map(f=>[f.id,f])); const end=new Date(endDate+'T00:00:00'); let loggedDays=0,targetDays=0,totalCal=0,totalProtein=0;
 for(let i=0;i<7;i++){const d=new Date(end);d.setDate(end.getDate()-i);const key=d.toISOString().slice(0,10);const day=logs.filter(x=>x.date===key);if(day.length)loggedDays++;let cal=0,protein=0;for(const l of day){const f=map.get(l.foodId);if(!f)continue;const basis=f.nutrition.basis;const factor=basis==='per_serving'?(l.quantity/f.nutrition.servingAmount!):((l.unit==='g'||l.unit==='ml')?l.quantity/100:l.quantity);cal+=f.nutrition.calories*factor;protein+=f.nutrition.protein*factor;}if(cal>0){targetDays++;totalCal+=cal;totalProtein+=protein;}}
 return {days:7,loggedDays,targetDays,adherencePercent:targetDays?Math.round(loggedDays/7*100):null,averageCalories:targetDays?totalCal/targetDays:null,averageProtein:targetDays?totalProtein/targetDays:null};
}
