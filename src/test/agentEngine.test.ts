import { describe, it, expect } from 'vitest';
import { createInitialSeedState } from '../data/seedData';
import { processUserMessage, toggleTaskInState, toggleShoppingItemInState } from '../services/agentEngine';

describe('HomeHandoff Agent Engine & Tool Execution', () => {
  it('Scenario 1: Creates multi-step plan, calendar event, tasks, shopping, and smart routine', () => {
    const initialState = createInitialSeedState();
    const prompt = 'My parents are visiting Friday. Prepare the house.';

    const result = processUserMessage(prompt, initialState);

    // Assert tools were called
    expect(result.executedTools.length).toBe(4);
    expect(result.executedTools.map(t => t.toolName)).toEqual([
      'calendar.createEvent',
      'tasks.batchCreate',
      'shopping.addItems',
      'routines.scheduleSmartHomeRoutine'
    ]);

    // Assert state was mutated
    expect(result.nextState.activePlan).not.toBeNull();
    expect(result.nextState.activePlan?.title).toBe('Parents Weekend Visit Preparation');
    
    // Check calendar event exists
    const visitEvent = result.nextState.events.find(e => e.title.includes('Parents'));
    expect(visitEvent).toBeDefined();
    expect(visitEvent?.type).toBe('visitor');

    // Check tasks were created
    const guestTasks = result.nextState.tasks.filter(t => t.planId === result.nextState.activePlan?.id);
    expect(guestTasks.length).toBe(5);
    expect(guestTasks.some(t => t.title.includes('guest bedroom'))).toBe(true);
    expect(guestTasks.some(t => t.title.includes('bathroom'))).toBe(true);

    // Check shopping items
    const guestShopping = result.nextState.shoppingItems.filter(s => s.planId === result.nextState.activePlan?.id);
    expect(guestShopping.length).toBe(5);

    // Check routine
    const welcomeRoutine = result.nextState.routines.find(r => r.name.includes('Parents'));
    expect(welcomeRoutine).toBeDefined();
    expect(welcomeRoutine?.enabled).toBe(true);
  });

  it('Scenario 2: Shifts plan, calendar, task deadlines, and routine trigger to Saturday 5 PM', () => {
    const initialState = createInitialSeedState();
    
    // First trigger scenario 1
    const step1 = processUserMessage('My parents are visiting Friday. Prepare the house.', initialState);
    
    // Now trigger scenario 2
    const step2 = processUserMessage("Actually, they're arriving Saturday at 5 PM.", step1.nextState);

    // Assert tools were executed
    expect(step2.executedTools.length).toBe(3);
    expect(step2.executedTools.map(t => t.toolName)).toEqual([
      'calendar.updateEvent',
      'tasks.rescheduleAssociated',
      'routines.updateRoutineTrigger'
    ]);

    // Assert calendar event updated
    const visitEvent = step2.nextState.events.find(e => e.title.includes('Parents'));
    expect(visitEvent).toBeDefined();
    const eventStartDate = new Date(visitEvent!.start);
    expect(eventStartDate.getDay()).toBe(6); // 6 is Saturday
    expect(eventStartDate.getHours()).toBe(17); // 5:00 PM

    // Assert task deadlines shifted to Saturday
    const planTasks = step2.nextState.tasks.filter(t => t.planId === step2.nextState.activePlan?.id);
    expect(planTasks.length).toBe(5);
    for (const task of planTasks) {
      const taskDue = new Date(task.dueDate);
      expect(taskDue.getDay()).toBe(6); // Saturday
    }

    // Assert routine trigger shifted to Saturday 3:30 PM
    const welcomeRoutine = step2.nextState.routines.find(r => r.name.includes('Parents'));
    expect(welcomeRoutine?.trigger).toContain('Saturday at 3:30 PM');
  });

  it('Scenario 3: Accurately summarizes incomplete tasks and dynamically calculates readiness score', () => {
    const initialState = createInitialSeedState();
    
    // Run scenario 1 and 2
    const step1 = processUserMessage('My parents are visiting Friday. Prepare the house.', initialState);
    const step2 = processUserMessage("Actually, they're arriving Saturday at 5 PM.", step1.nextState);

    // Query status
    const statusQuery1 = processUserMessage('What still needs doing before they arrive?', step2.nextState);
    expect(statusQuery1.executedTools.length).toBe(1);
    expect(statusQuery1.executedTools[0].toolName).toBe('agent.inspectState');
    expect(statusQuery1.responseMessage.planSummary?.readinessScore).toBe(0);

    // Now toggle 2 tasks as complete in state
    const planTasks = step2.nextState.tasks.filter(t => t.planId === step2.nextState.activePlan?.id);
    let mutatedState = toggleTaskInState(step2.nextState, planTasks[0].id);
    mutatedState = toggleTaskInState(mutatedState, planTasks[1].id);

    // Query status again
    const statusQuery2 = processUserMessage('What still needs doing before they arrive?', mutatedState);
    expect(statusQuery2.responseMessage.planSummary?.completedTasks).toBe(2);
    expect(statusQuery2.responseMessage.planSummary?.totalTasks).toBe(5);
    expect(statusQuery2.responseMessage.planSummary?.readinessScore).toBe(40); // 2/5 = 40%
    expect(statusQuery2.responseMessage.text).toContain('40%');
  });

  it('handles reasonable phrasing variations for all 3 scenarios', () => {
    const state = createInitialSeedState();

    // Phrasing variations for Scenario 1
    const p1 = processUserMessage('Mom and dad are visiting Friday. Please get the house ready.', state);
    expect(p1.nextState.activePlan).not.toBeNull();
    expect(p1.executedTools.some(t => t.toolName === 'calendar.createEvent')).toBe(true);

    // Phrasing variations for Scenario 2
    const p2 = processUserMessage('Change of plans, they arrive on Saturday at 5pm instead.', p1.nextState);
    expect(p2.executedTools.some(t => t.toolName === 'tasks.rescheduleAssociated')).toBe(true);
    const updatedEvent = p2.nextState.events.find(e => e.id === p2.nextState.activePlan?.targetEventId);
    expect(new Date(updatedEvent!.start).getDay()).toBe(6);

    // Phrasing variations for Scenario 3
    const p3 = processUserMessage("What's left to do before they get here?", p2.nextState);
    expect(p3.executedTools[0].toolName).toBe('agent.inspectState');
    expect(p3.responseMessage.planSummary).toBeDefined();
  });

  it('reschedules only the active plan and preserves completed tasks, unrelated tasks, events, and routines', () => {
    const initialState = createInitialSeedState();
    
    // Add an unrelated task and event
    const unrelatedTaskId = 'unrelated-task-1';
    initialState.tasks.push({
      id: unrelatedTaskId,
      title: 'Fix bike tire',
      category: 'general',
      priority: 'low',
      assignee: 'Sam',
      dueDate: new Date(2026, 9, 23, 14, 0).toISOString(),
      completed: false,
      estimatedMinutes: 25
    });

    // Create plan
    const step1 = processUserMessage('My parents are visiting Friday. Prepare the house.', initialState);
    
    // Mark one of the plan tasks as completed prior to rescheduling
    const planTasks = step1.nextState.tasks.filter(t => t.planId === step1.nextState.activePlan?.id);
    const completedTaskId = planTasks[0].id;
    const stateWithCompletedTask = toggleTaskInState(step1.nextState, completedTaskId);
    expect(stateWithCompletedTask.tasks.find(t => t.id === completedTaskId)?.completed).toBe(true);

    // Reschedule
    const step2 = processUserMessage("Actually, they're arriving Saturday at 5 PM.", stateWithCompletedTask);

    // Check completion was preserved
    const afterRescheduleCompletedTask = step2.nextState.tasks.find(t => t.id === completedTaskId);
    expect(afterRescheduleCompletedTask?.completed).toBe(true);
    expect(afterRescheduleCompletedTask?.estimatedMinutes).toBe(planTasks[0].estimatedMinutes);

    // Check unrelated task was NOT modified
    const unrelatedTaskAfter = step2.nextState.tasks.find(t => t.id === unrelatedTaskId);
    expect(unrelatedTaskAfter).toBeDefined();
    expect(unrelatedTaskAfter?.dueDate).toBe(initialState.tasks.find(t => t.id === unrelatedTaskId)?.dueDate);

    // Check unrelated routine was NOT modified
    const nightRoutine = step2.nextState.routines.find(r => r.id === 'rtn-seed-1');
    expect(nightRoutine?.trigger).toBe('Every night at 11:00 PM');
  });

  it('gracefully handles reschedule intent when no active plan exists', () => {
    const initialState = createInitialSeedState();
    expect(initialState.activePlan).toBeNull();

    const result = processUserMessage("Actually, they're arriving Saturday at 5 PM.", initialState);

    // Should not crash, and should explain there is no active visit plan
    expect(result.executedTools.length).toBe(0);
    expect(result.responseMessage.text.toLowerCase()).toContain('no active visit plan');
  });

  it('gracefully responds to unrelated queries without triggering false-positive plans', () => {
    const initialState = createInitialSeedState();

    const result = processUserMessage('What is the weather like in Seattle today?', initialState);

    expect(result.executedTools.length).toBe(0);
    expect(result.nextState.activePlan).toBeNull();
    expect(result.responseMessage.text).toContain('HomeHandoff');
  });

  it('handles rapid sequential state updates and tool history tracking', () => {
    let state = createInitialSeedState();

    // Sequential operations
    const r1 = processUserMessage('My parents are visiting Friday. Prepare the house.', state);
    state = r1.nextState;

    // Toggle shopping item
    const shoppingId = state.shoppingItems[0].id;
    state = toggleShoppingItemInState(state, shoppingId);
    expect(state.shoppingItems.find(s => s.id === shoppingId)?.completed).toBe(true);

    // Toggle task
    const taskId = state.tasks.find(t => t.planId === state.activePlan?.id)!.id;
    state = toggleTaskInState(state, taskId);
    expect(state.tasks.find(t => t.id === taskId)?.completed).toBe(true);

    // Reschedule
    const r2 = processUserMessage("Actually, they're arriving Saturday at 5 PM.", state);
    state = r2.nextState;

    // Check tool history accumulated all executions
    expect(state.toolHistory.length).toBeGreaterThan(5);
    expect(state.tasks.find(t => t.id === taskId)?.completed).toBe(true);
    expect(state.shoppingItems.find(s => s.id === shoppingId)?.completed).toBe(true);
  });
});
