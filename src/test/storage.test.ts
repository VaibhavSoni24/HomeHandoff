import { describe, it, expect, beforeEach } from 'vitest';
import { validateAndSanitizeState, loadStateFromStorage, saveStateToStorage, resetDemoState } from '../services/storage';
import { createInitialSeedState } from '../data/seedData';

// Shim localStorage in test environment
const storageMap = new Map<string, string>();
const localStorageMock = {
  getItem: (key: string) => storageMap.get(key) ?? null,
  setItem: (key: string, val: string) => { storageMap.set(key, String(val)); },
  removeItem: (key: string) => { storageMap.delete(key); },
  clear: () => { storageMap.clear(); },
  get length() { return storageMap.size; },
  key: (i: number) => Array.from(storageMap.keys())[i] ?? null,
};

if (typeof globalThis.localStorage === 'undefined') {
  Object.defineProperty(globalThis, 'localStorage', {
    value: localStorageMock,
    writable: true,
    configurable: true,
  });
}

describe('storage: validation, persistence, and reset', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('safely handles null, undefined, or primitive non-object input', () => {
    const seed = createInitialSeedState();

    const fromNull = validateAndSanitizeState(null);
    expect(fromNull.events.length).toBe(seed.events.length);
    expect(fromNull.tasks.length).toBe(seed.tasks.length);

    const fromString = validateAndSanitizeState('corrupted json');
    expect(fromString.events.length).toBe(seed.events.length);

    const fromNumber = validateAndSanitizeState(12345);
    expect(fromNumber.events.length).toBe(seed.events.length);
  });

  it('restores missing arrays and settings with sensible fallbacks without wiping valid data', () => {
    const partialData = {
      activePlan: {
        id: 'plan-existing',
        title: 'Existing Plan',
        description: 'Test',
        status: 'active',
        targetDate: '2026-10-24T17:00:00Z',
        createdAt: '2026-10-23T12:00:00Z',
        updatedAt: '2026-10-23T12:00:00Z',
        category: 'guest_prep',
        milestones: []
      },
      // missing events, tasks, etc.
      settings: {
        voiceFeedback: true
      }
    };

    const sanitized = validateAndSanitizeState(partialData);
    expect(sanitized.activePlan?.id).toBe('plan-existing');
    expect(sanitized.settings.voiceFeedback).toBe(true);
    expect(sanitized.settings.ambientSound).toBe(true); // defaulted safely
    expect(Array.isArray(sanitized.events)).toBe(true);
    expect(Array.isArray(sanitized.tasks)).toBe(true);
    expect(Array.isArray(sanitized.toolHistory)).toBe(true);
  });

  it('persists state to localStorage and reloads accurately', () => {
    const seed = createInitialSeedState();
    seed.tasks.push({
      id: 'task-custom',
      title: 'Water the plants',
      category: 'general',
      priority: 'low',
      assignee: 'Alex',
      dueDate: new Date().toISOString(),
      completed: true,
      estimatedMinutes: 10
    });

    saveStateToStorage(seed);
    const loaded = loadStateFromStorage();

    expect(loaded.tasks.some(t => t.id === 'task-custom')).toBe(true);
    expect(loaded.tasks.find(t => t.id === 'task-custom')?.completed).toBe(true);
  });

  it('resets state cleanly to initial seed state', () => {
    const modified = createInitialSeedState();
    modified.events = [];
    saveStateToStorage(modified);

    const reset = resetDemoState();
    expect(reset.events.length).toBeGreaterThan(0);

    const reloaded = loadStateFromStorage();
    expect(reloaded.events.length).toBe(reset.events.length);
  });
});
