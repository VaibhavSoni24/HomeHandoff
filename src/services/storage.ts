import type { HouseholdState } from '../types/household';
import { createInitialSeedState } from '../data/seedData';

const STORAGE_KEY = 'homehandoff_state_v1';

export function loadStateFromStorage(): HouseholdState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      const initial = createInitialSeedState();
      saveStateToStorage(initial);
      return initial;
    }
    const parsed = JSON.parse(raw);
    // Ensure all critical fields exist
    if (!parsed.events || !parsed.tasks || !parsed.shoppingItems || !parsed.routines) {
      const initial = createInitialSeedState();
      saveStateToStorage(initial);
      return initial;
    }
    return parsed;
  } catch (err) {
    console.error('Failed to load state from localStorage:', err);
    return createInitialSeedState();
  }
}

export function saveStateToStorage(state: HouseholdState): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (err) {
    console.error('Failed to save state to localStorage:', err);
  }
}

export function resetDemoState(): HouseholdState {
  const fresh = createInitialSeedState();
  saveStateToStorage(fresh);
  return fresh;
}
