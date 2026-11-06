import { describe, expect, it } from 'vitest';
import { clampReps, sanitizeWeight, parseWeight, stepWeight, fmtWeight, lbToKg } from './num';

describe('משקל עשרוני', () => {
  it('הבאג: "17.5" היה נקרא כ-175', () => {
    // parseInt על raw.replace(/[^0-9]/g,'') החזיר 175 — פי עשר, בשקט.
    expect(parseWeight('17.5')).toBe(17.5);
    expect(parseWeight('1.25')).toBe(1.25);
    expect(parseWeight('20.41')).toBe(20.41);
  });

  it('קלט חלקי באמצע הקלדה לא נבלע', () => {
    expect(sanitizeWeight('17.')).toBe('17.');      // הנקודה שורדת עד שתוקלד הספרה
    expect(sanitizeWeight('17.50')).toBe('17.50');
    expect(sanitizeWeight('1.2.3')).toBe('1.23');   // נקודה שנייה מתעלמים ממנה
    expect(sanitizeWeight('17,5')).toBe('17.5');    // פסיק כמו נקודה
    expect(sanitizeWeight('abc')).toBe('');
    expect(sanitizeWeight('17.567')).toBe('17.56'); // שתי ספרות ותו לא
  });

  it('גבולות', () => {
    expect(parseWeight('')).toBe(0);
    expect(parseWeight('-5')).toBe(5);              // המינוס נופל בניקוי
    expect(parseWeight('9999')).toBe(999);
    expect(parseWeight('.5')).toBe(0.5);
  });

  it('צעד שומר על העשרוני ולא צובר שגיאת נקודה צפה', () => {
    expect(stepWeight(17.5, 1)).toBe(18.5);
    expect(stepWeight(17.5, -1)).toBe(16.5);
    expect(stepWeight(0.1, 0.2)).toBe(0.3);         // ולא 0.30000000000000004
    expect(stepWeight(0, -1)).toBe(0);              // לא יורד מתחת לאפס
    expect(stepWeight(undefined, 1)).toBe(1);
  });

  it('תצוגה בלי אפסים מיותרים', () => {
    expect(fmtWeight(20)).toBe('20');
    expect(fmtWeight(17.5)).toBe('17.5');
    expect(fmtWeight(1.25)).toBe('1.25');
    expect(fmtWeight(undefined)).toBe('');
  });

  it('ליברות לק"ג', () => {
    expect(lbToKg(45)).toBe(20.41);
    expect(lbToKg(25)).toBe(11.34);
    expect(lbToKg(10)).toBe(4.54);
  });

  it('חזרות נשארות שלמות', () => {
    expect(clampReps('12')).toBe(12);
    expect(clampReps('12.7')).toBe(127);   // התנהגות קיימת: חזרות אינן עשרוניות
    expect(clampReps('')).toBe(0);
  });
});
