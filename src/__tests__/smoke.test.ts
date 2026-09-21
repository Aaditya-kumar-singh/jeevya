import { canAccess, checkAccess } from '@/services/capabilities';
import { todayCivilDate, isValidCivilDate } from '@/lib/date';

describe('Jeevya production smoke checks', () => {
  it('allows local features for guests', () => {
    expect(canAccess('tasks', 'guest')).toBe(true);
    expect(checkAccess('tasks', 'guest').requiresAuthentication).toBe(false);
  });

  it('gates account features for guests', () => {
    const result = checkAccess('cloudSync', 'guest');
    expect(result.allowed).toBe(false);
    expect(result.requiresAuthentication).toBe(true);
  });

  it('allows account features after authentication', () => {
    expect(canAccess('cloudSync', 'authenticated')).toBe(true);
    expect(canAccess('crossDevice', 'authenticated')).toBe(true);
  });

  it('produces a valid civil date', () => {
    expect(isValidCivilDate(todayCivilDate())).toBe(true);
  });
});
