import { describe, it, expect } from 'vitest';
import { computePlanReadiness } from '../utils/readiness';
import { createInitialSeedState } from '../data/seedData';
import type { Task, ShoppingItem } from '../types/household';

describe('readiness: computePlanReadiness', () => {
  it('returns 0% when no tasks are completed', () => {
    const seed = createInitialSeedState();
    seed.tasks = seed.tasks.map(t => ({ ...t, completed: false }));
    // Default seed has activePlan: null
    const result = computePlanReadiness(seed);
    expect(result.readinessPercent).toBe(0);
    expect(result.totalTasks).toBe(seed.tasks.length);
    expect(result.completedTasks).toBe(0);
  });

  it('accurately calculates readiness based on activePlan tasks', () => {
    const seed = createInitialSeedState();
    const planId = 'plan-test-123';
    seed.activePlan = {
      id: planId,
      title: 'Party Prep',
      description: 'Prepare for party',
      status: 'active',
      targetDate: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      category: 'party',
      milestones: []
    };

    const planTasks: Task[] = [
      { id: 't1', title: 'Clean floor', category: 'cleaning', priority: 'medium', assignee: 'Alex', dueDate: new Date().toISOString(), completed: true, planId, estimatedMinutes: 20 },
      { id: 't2', title: 'Buy ice', category: 'groceries', priority: 'high', assignee: 'Jordan', dueDate: new Date().toISOString(), completed: false, planId, estimatedMinutes: 15 },
      { id: 't3', title: 'Set tables', category: 'general', priority: 'low', assignee: 'Sam', dueDate: new Date().toISOString(), completed: false, planId, estimatedMinutes: 10 },
      { id: 't4', title: 'Put music on', category: 'smart_home', priority: 'low', assignee: 'Alex', dueDate: new Date().toISOString(), completed: true, planId, estimatedMinutes: 5 },
    ];

    const planShopping: ShoppingItem[] = [
      { id: 's1', name: 'Ice bag', quantity: '2 bags', category: 'Beverages', completed: false, planId },
      { id: 's2', name: 'Cups', quantity: '50 pack', category: 'Guest Amenities', completed: true, planId },
    ];

    seed.tasks = [...seed.tasks, ...planTasks];
    seed.shoppingItems = [...seed.shoppingItems, ...planShopping];

    const metrics = computePlanReadiness(seed);

    // 2 out of 4 plan tasks completed => 50%
    expect(metrics.totalTasks).toBe(4);
    expect(metrics.completedTasks).toBe(2);
    expect(metrics.readinessPercent).toBe(50);
    expect(metrics.openTasks).toBe(2);
    expect(metrics.unpurchasedShopping).toBe(1);
  });

  it('returns 100% when all plan tasks are completed', () => {
    const seed = createInitialSeedState();
    const planId = 'plan-done';
    seed.activePlan = {
      id: planId,
      title: 'Done Plan',
      description: 'Done',
      status: 'completed',
      targetDate: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      category: 'general',
      milestones: []
    };

    seed.tasks = [
      { id: 't1', title: 'Task 1', category: 'general', priority: 'low', assignee: 'Alex', dueDate: new Date().toISOString(), completed: true, planId, estimatedMinutes: 10 }
    ];

    const metrics = computePlanReadiness(seed);
    expect(metrics.readinessPercent).toBe(100);
    expect(metrics.completedTasks).toBe(1);
    expect(metrics.openTasks).toBe(0);
  });
});
