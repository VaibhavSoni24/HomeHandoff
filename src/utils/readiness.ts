import type { HouseholdState } from '../types/household';

export interface ReadinessResult {
  hasActivePlan: boolean;
  planTitle: string | null;
  readinessPercent: number;
  completedTasks: number;
  totalTasks: number;
  openTasks: number;
  unpurchasedShopping: number;
  nextMilestoneTitle: string | null;
}

/**
 * Single source of truth for household plan readiness and metrics synchronization
 */
export function computePlanReadiness(state: HouseholdState): ReadinessResult {
  const activePlan = state.activePlan;

  if (activePlan) {
    const planTasks = state.tasks.filter(t => t.planId === activePlan.id);
    const completedTasks = planTasks.filter(t => t.completed).length;
    const totalTasks = planTasks.length;
    const openTasks = totalTasks - completedTasks;
    const readinessPercent = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 100;

    const unpurchasedShopping = state.shoppingItems.filter(
      s => s.planId === activePlan.id && !s.completed
    ).length;

    // Find next incomplete milestone or task
    const nextMilestone = activePlan.milestones.find(m => !m.completed);
    const nextIncompleteTask = planTasks.find(t => !t.completed);

    return {
      hasActivePlan: true,
      planTitle: activePlan.title,
      readinessPercent,
      completedTasks,
      totalTasks,
      openTasks,
      unpurchasedShopping,
      nextMilestoneTitle: nextMilestone?.title || nextIncompleteTask?.title || 'Arrival & Welcome'
    };
  }

  // Fallback when no active visit plan is active
  const totalTasks = state.tasks.length;
  const completedTasks = state.tasks.filter(t => t.completed).length;
  const openTasks = totalTasks - completedTasks;
  const readinessPercent = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 100;
  const unpurchasedShopping = state.shoppingItems.filter(s => !s.completed).length;

  return {
    hasActivePlan: false,
    planTitle: null,
    readinessPercent,
    completedTasks,
    totalTasks,
    openTasks,
    unpurchasedShopping,
    nextMilestoneTitle: null
  };
}
