import { buildXPProgress, getLevelForXp, getRankForLevel } from '@/services/xp';

describe('XP progression', () => {
  it('starts at level 1 with no XP', () => {
    expect(getLevelForXp(0)).toBe(1);
  });

  it('moves through documented levels', () => {
    expect(getLevelForXp(100)).toBe(2);
    expect(getLevelForXp(250)).toBe(3);
  });

  it('assigns ranks from level', () => {
    expect(getRankForLevel(1)).toBe('Starter');
    expect(getRankForLevel(10)).toBe('Builder');
    expect(getRankForLevel(50)).toBe('Transcendent');
  });

  it('calculates category totals and daily streak', () => {
    const today = new Date().toISOString().slice(0, 10);
    const yesterdayDate = new Date();
    yesterdayDate.setDate(yesterdayDate.getDate() - 1);
    const yesterday = yesterdayDate.toISOString().slice(0, 10);
    const events = [
      { id: '1', source: 'task', sourceId: 'a', category: 'life' as const, action: 'task_completed' as const, baseXp: 10, bonusXp: 0, totalXp: 10, date: yesterday, createdAt: yesterday + 'T10:00:00.000Z' },
      { id: '2', source: 'habit', sourceId: 'b', category: 'life' as const, action: 'habit_completed' as const, baseXp: 15, bonusXp: 0, totalXp: 15, date: today, createdAt: today + 'T10:00:00.000Z' },
    ];
    const progress = buildXPProgress(events);
    expect(progress.totalXp).toBe(25);
    expect(progress.categoryXp.life).toBe(25);
    expect(progress.streakDays).toBe(2);
  });
});
