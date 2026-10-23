import type { HouseholdState } from '../types/household';
import { createInitialSeedState } from '../data/seedData';

const STORAGE_KEY = 'homehandoff_state_v1';

/**
 * Validate and sanitize stored state for backward compatibility and resilience
 */
export function validateAndSanitizeState(raw: unknown): HouseholdState {
  const seed = createInitialSeedState();

  if (!raw || typeof raw !== 'object') {
    return seed;
  }

  const obj = raw as Record<string, unknown>;

  // Safely check array fields with fallback to seed
  const events = Array.isArray(obj.events) ? obj.events : seed.events;
  const tasks = Array.isArray(obj.tasks) ? obj.tasks : seed.tasks;
  const shoppingItems = Array.isArray(obj.shoppingItems) ? obj.shoppingItems : seed.shoppingItems;
  const routines = Array.isArray(obj.routines) ? obj.routines : seed.routines;
  const toolHistory = Array.isArray(obj.toolHistory) ? obj.toolHistory : [];
  const chatHistory = Array.isArray(obj.chatHistory) && obj.chatHistory.length > 0 
    ? obj.chatHistory 
    : seed.chatHistory;
  const householdMembers = Array.isArray(obj.householdMembers) && obj.householdMembers.length > 0
    ? obj.householdMembers
    : seed.householdMembers;

  const rawSettings = (obj.settings && typeof obj.settings === 'object') 
    ? (obj.settings as Record<string, unknown>) 
    : {};

  const settings = {
    voiceFeedback: typeof rawSettings.voiceFeedback === 'boolean' ? rawSettings.voiceFeedback : false,
    ambientSound: typeof rawSettings.ambientSound === 'boolean' ? rawSettings.ambientSound : true,
  };

  const activePlan = (obj.activePlan && typeof obj.activePlan === 'object' && 'id' in obj.activePlan)
    ? (obj.activePlan as HouseholdState['activePlan'])
    : null;

  const archivedPlans = Array.isArray(obj.archivedPlans) 
    ? (obj.archivedPlans as HouseholdState['archivedPlans'])
    : [];

  return {
    activePlan,
    archivedPlans,
    events,
    tasks,
    shoppingItems,
    routines,
    toolHistory,
    chatHistory,
    householdMembers,
    settings
  };
}

export function loadStateFromStorage(): HouseholdState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      const initial = createInitialSeedState();
      saveStateToStorage(initial);
      return initial;
    }
    const parsed = JSON.parse(raw);
    const sanitized = validateAndSanitizeState(parsed);
    return sanitized;
  } catch (err) {
    console.error('Failed to load state from localStorage, falling back to seed:', err);
    const initial = createInitialSeedState();
    saveStateToStorage(initial);
    return initial;
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
