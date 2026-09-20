// מה שהבונה מראה חייב להיות מה שהילה סופרת — אותו משפט, אותו מנוע
import { describe, expect, it } from 'vitest';
import { mealText } from './MealBuilder';
import { estimateFood, mergeFoods, FoodItem } from '../store/foodDB';

const foods = mergeFoods(undefined);
const f = (id: string) => foods.find(x => x.id === id)!;

describe('בונה ארוחה', () => {
  it('מרכיב משפט שהפרסר מבין בחזרה — פריטי גרמים ויחידות', () => {
    const picked = [{ food: f('chicken'), qty: 200 }, { food: f('egg'), qty: 3 }, { food: f('bioyog'), qty: 1 }];
    const text = mealText(picked);
    const e = estimateFood(text, foods);
    expect(e.notInDB).toEqual([]);
    expect(e.lines.map(l => l.name)).toEqual(['חזה עוף', 'ביצה', 'יוגורט ביו']);
    expect(e.lines[0].qty).toBe(200);
    expect(e.lines[1].qty).toBe(3);
    expect(e.lines[2].qty).toBe(1);
    expect(e.total.kcal).toBe(330 + 215 + 134);
  });

  it('כמות אפס לא נכנסת למשפט', () => {
    expect(mealText([{ food: f('bamba'), qty: 0 }, { food: f('cottage'), qty: 250 }])).toBe('קוטג 250 גרם');
  });

  it('כל מאכל במאגר שורד הלוך-חזור דרך הבונה', () => {
    const broken: string[] = [];
    for (const item of foods as FoodItem[]) {
      const qty = item.unit === 'unit' ? 2 : 100;
      const e = estimateFood(mealText([{ food: item, qty }]), foods);
      if (e.lines.length !== 1 || e.lines[0].name !== item.names[0] || e.lines[0].qty !== qty) {
        broken.push(`${item.names[0]} → ${e.lines.map(l => `${l.name} ${l.qty}`).join('+') || 'כלום'}`);
      }
    }
    expect(broken).toEqual([]);
  });
});
