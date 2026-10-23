import type { 
  HouseholdState, 
  CalendarEvent, 
  Task, 
  ShoppingItem, 
  SmartRoutine,
  ToolCall,
  ChatMessage
} from '../types/household';
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

  // Safely check array fields with filter for valid items and fallback to seed
  const rawEvents = Array.isArray(obj.events) ? obj.events : seed.events;
  const events: CalendarEvent[] = rawEvents.filter(
    (e): e is CalendarEvent => !!e && typeof e === 'object' && typeof (e as any).id === 'string' && typeof (e as any).title === 'string'
  );

  const rawTasks = Array.isArray(obj.tasks) ? obj.tasks : seed.tasks;
  const tasks: Task[] = rawTasks.filter(
    (t): t is Task => !!t && typeof t === 'object' && typeof (t as any).id === 'string' && typeof (t as any).title === 'string'
  );

  const rawShopping = Array.isArray(obj.shoppingItems) ? obj.shoppingItems : seed.shoppingItems;
  const shoppingItems: ShoppingItem[] = rawShopping.filter(
    (s): s is ShoppingItem => !!s && typeof s === 'object' && typeof (s as any).id === 'string' && typeof (s as any).name === 'string'
  );

  const rawRoutines = Array.isArray(obj.routines) ? obj.routines : seed.routines;
  const routines: SmartRoutine[] = rawRoutines.filter(
    (r): r is SmartRoutine => !!r && typeof r === 'object' && typeof (r as any).id === 'string' && typeof (r as any).name === 'string' && Array.isArray((r as any).actions)
  );

  const rawTools = Array.isArray(obj.toolHistory) ? obj.toolHistory : [];
  const toolHistory: ToolCall[] = rawTools.filter(
    (t): t is ToolCall => !!t && typeof t === 'object' && typeof (t as any).id === 'string' && typeof (t as any).toolName === 'string'
  );

  const rawChat = Array.isArray(obj.chatHistory) && obj.chatHistory.length > 0 
    ? obj.chatHistory 
    : seed.chatHistory;
  const chatHistory: ChatMessage[] = rawChat.filter(
    (m): m is ChatMessage => !!m && typeof m === 'object' && typeof (m as any).id === 'string' && typeof (m as any).text === 'string'
  );

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
    events: events.length > 0 ? events : seed.events,
    tasks: tasks.length > 0 ? tasks : seed.tasks,
    shoppingItems: shoppingItems.length > 0 ? shoppingItems : seed.shoppingItems,
    routines: routines.length > 0 ? routines : seed.routines,
    toolHistory,
    chatHistory: chatHistory.length > 0 ? chatHistory : seed.chatHistory,
    householdMembers,
    settings
  };
}

const getStorage = (): Storage | null => {
  try {
    if (typeof window !== 'undefined' && window.localStorage) return window.localStorage;
    if (typeof globalThis !== 'undefined' && (globalThis as any).localStorage) return (globalThis as any).localStorage;
    if (typeof localStorage !== 'undefined') return localStorage;
  } catch {
    return null;
  }
  return null;
};

export function loadStateFromStorage(): HouseholdState {
  try {
    const storage = getStorage();
    if (!storage) {
      return createInitialSeedState();
    }
    const raw = storage.getItem(STORAGE_KEY);
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
    const storage = getStorage();
    if (storage) {
      storage.setItem(STORAGE_KEY, JSON.stringify(state));
    }
  } catch (err) {
    console.error('Failed to save state to localStorage:', err);
  }
}

export function resetDemoState(): HouseholdState {
  const fresh = createInitialSeedState();
  saveStateToStorage(fresh);
  return fresh;
}
