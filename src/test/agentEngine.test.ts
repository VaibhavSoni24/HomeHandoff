import { describe, it, expect } from 'vitest';
import { createInitialSeedState } from '../data/seedData';
import { processUserMessage, toggleTaskInState } from '../services/agentEngine';

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
});
