import { describe, it, expect } from 'vitest';
import { createInitialSeedState } from '../data/seedData';
import { 
  processUserMessage, 
  toggleTaskInState, 
  toggleShoppingItemInState,
  toggleRoutineInState 
} from '../services/agentEngine';
import { computePlanReadiness } from '../utils/readiness';
import { resetDemoState } from '../services/storage';

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
      const taskDue = new Date(task.dueDate!);
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

  it('verifies complete parents-visit -> reschedule -> readiness-inspection workflow with unified readiness', () => {
    const state = createInitialSeedState();

    // 1. Initial Plan Creation (Scenario 1)
    const step1 = processUserMessage('My parents are visiting Friday. Prepare the house.', state);
    expect(step1.nextState.activePlan).not.toBeNull();
    const readinessAfterStep1 = computePlanReadiness(step1.nextState);
    expect(readinessAfterStep1.readinessPercent).toBe(0);
    expect(readinessAfterStep1.completedTasks).toBe(0);
    expect(readinessAfterStep1.totalTasks).toBe(5);

    // 2. Complete 1 Task
    const planTasks = step1.nextState.tasks.filter(t => t.planId === step1.nextState.activePlan?.id);
    const stateWith1TaskDone = toggleTaskInState(step1.nextState, planTasks[0].id);
    const readinessWith1Done = computePlanReadiness(stateWith1TaskDone);
    expect(readinessWith1Done.readinessPercent).toBe(20); // 1/5 = 20%
    expect(readinessWith1Done.completedTasks).toBe(1);

    // 3. Reschedule to Saturday (Scenario 2)
    const step2 = processUserMessage("Actually, they're arriving Saturday at 5 PM.", stateWith1TaskDone);
    // Completion state survives reschedule
    const readinessAfterReschedule = computePlanReadiness(step2.nextState);
    expect(readinessAfterReschedule.readinessPercent).toBe(20);
    expect(readinessAfterReschedule.completedTasks).toBe(1);

    // 4. Query Readiness (Scenario 3)
    const step3 = processUserMessage('What still needs doing before they arrive?', step2.nextState);
    expect(step3.responseMessage.planSummary?.readinessScore).toBe(20);
    expect(step3.responseMessage.planSummary?.completedTasks).toBe(1);
    expect(step3.responseMessage.planSummary?.totalTasks).toBe(5);

    // 5. Toggle routine
    const routineId = step3.nextState.routines[0].id;
    const stateWithRoutineToggled = toggleRoutineInState(step3.nextState, routineId);
    expect(stateWithRoutineToggled.toolHistory.some(t => t.toolName === 'routines.toggleRoutine')).toBe(true);
  });

  it('Removes hardcoded PIN 8492 and uses SIMULATED-CODE-NOT-ISSUED with explicit no-lock disclosure', () => {
    const initialState = createInitialSeedState();
    const result = processUserMessage('My parents are visiting Friday. Prepare the house.', initialState);

    const serializedState = JSON.stringify(result.nextState);
    const serializedTools = JSON.stringify(result.executedTools);

    // Literal 8492 must NOT appear anywhere in state or tool traces
    expect(serializedState.includes('8492')).toBe(false);
    expect(serializedTools.includes('8492')).toBe(false);

    // Fictional placeholder must be present
    expect(serializedState.includes('SIMULATED-CODE-NOT-ISSUED')).toBe(true);
    expect(serializedTools.includes('SIMULATED-CODE-NOT-ISSUED')).toBe(true);

    // Explicit disclosure that no physical lock was contacted
    expect(serializedState.toLowerCase().includes('no physical lock')).toBe(true);
  });

  it('Rescheduling: Moves visit to an explicit calendar date (e.g., November 14, 2026 at 5 PM) and preserves event duration, task buffers, and routine triggers', () => {
    const initialState = createInitialSeedState();
    const step1 = processUserMessage('My parents are visiting Friday. Prepare the house.', initialState);

    // Target visit event before reschedule
    const originalEvent = step1.nextState.events.find(e => e.id === step1.nextState.activePlan?.targetEventId);
    expect(originalEvent).toBeDefined();
    const originalDurationMs = new Date(originalEvent!.end).getTime() - new Date(originalEvent!.start).getTime();

    // Reschedule to an explicit date
    const step2 = processUserMessage('Move the visit to November 14, 2026 at 5 PM', step1.nextState);

    expect(step2.executedTools.length).toBe(3);
    expect(step2.executedTools.map(t => t.toolName)).toEqual([
      'calendar.updateEvent',
      'tasks.rescheduleAssociated',
      'routines.updateRoutineTrigger'
    ]);

    // Check calendar event
    const updatedEvent = step2.nextState.events.find(e => e.id === originalEvent!.id);
    expect(updatedEvent).toBeDefined();
    const newStart = new Date(updatedEvent!.start);
    expect(newStart.getFullYear()).toBe(2026);
    expect(newStart.getMonth()).toBe(10); // November
    expect(newStart.getDate()).toBe(14);
    expect(newStart.getHours()).toBe(17); // 5 PM

    // Verify duration was preserved
    const newDurationMs = new Date(updatedEvent!.end).getTime() - newStart.getTime();
    expect(newDurationMs).toBe(originalDurationMs);

    // Check task deadlines have pre-arrival buffers relative to Nov 14 at 5 PM
    const planTasks = step2.nextState.tasks.filter(t => t.planId === step2.nextState.activePlan?.id);
    expect(planTasks.length).toBe(5);

    const bedroomTask = planTasks.find(t => t.title.includes('bedroom'));
    expect(new Date(bedroomTask!.dueDate!).getDate()).toBe(14);
    expect(new Date(bedroomTask!.dueDate!).getHours()).toBe(11); // Morning of arrival

    const bathroomTask = planTasks.find(t => t.title.includes('bathroom'));
    expect(new Date(bathroomTask!.dueDate!).getDate()).toBe(14);
    expect(new Date(bathroomTask!.dueDate!).getHours()).toBe(13); // Midday of arrival

    const groceryTask = planTasks.find(t => t.title.includes('groceries'));
    expect(new Date(groceryTask!.dueDate!).getDate()).toBe(14);
    expect(new Date(groceryTask!.dueDate!).getHours()).toBe(14); // 3h before 5 PM arrival

    // Check routine trigger updated to 90 mins before (3:30 PM)
    const welcomeRoutine = step2.nextState.routines.find(r => r.name.includes('Parents'));
    expect(welcomeRoutine?.trigger).toContain('3:30 PM');
    expect(welcomeRoutine?.trigger).toContain('90 mins before arrival');
  });

  it('Rescheduling: Preserves completed tasks and leaves unrelated household events and chores untouched', () => {
    const initialState = createInitialSeedState();
    const step1 = processUserMessage('My parents are visiting Friday. Prepare the house.', initialState);

    // Complete one plan task and note unrelated tasks and events
    const planTasks = step1.nextState.tasks.filter(t => t.planId === step1.nextState.activePlan?.id);
    const stateWithCompletedTask = toggleTaskInState(step1.nextState, planTasks[0].id);

    const unrelatedTaskOriginal = stateWithCompletedTask.tasks.find(t => t.id === 'task-seed-2')!;
    const unrelatedEventOriginal = stateWithCompletedTask.events.find(e => e.id === 'evt-seed-1')!;
    const unrelatedRoutineOriginal = stateWithCompletedTask.routines.find(r => r.id === 'rtn-seed-1')!;

    // Reschedule
    const step2 = processUserMessage('Move the visit to November 14, 2026 at 5 PM', stateWithCompletedTask);

    // Plan task completion was preserved
    const toggledTaskAfter = step2.nextState.tasks.find(t => t.id === planTasks[0].id);
    expect(toggledTaskAfter?.completed).toBe(true);

    // Unrelated task untouched
    const unrelatedTaskAfter = step2.nextState.tasks.find(t => t.id === 'task-seed-2');
    expect(unrelatedTaskAfter?.dueDate).toBe(unrelatedTaskOriginal.dueDate);
    expect(unrelatedTaskAfter?.completed).toBe(unrelatedTaskOriginal.completed);

    // Unrelated event untouched
    const unrelatedEventAfter = step2.nextState.events.find(e => e.id === 'evt-seed-1');
    expect(unrelatedEventAfter?.start).toBe(unrelatedEventOriginal.start);
    expect(unrelatedEventAfter?.end).toBe(unrelatedEventOriginal.end);

    // Unrelated routine untouched
    const unrelatedRoutineAfter = step2.nextState.routines.find(r => r.id === 'rtn-seed-1');
    expect(unrelatedRoutineAfter?.trigger).toBe(unrelatedRoutineOriginal.trigger);
  });

  it('Rejects impossible calendar dates (e.g., February 31) without crashing or JavaScript date overflow', () => {
    const initialState = createInitialSeedState();
    const step1 = processUserMessage('My parents are visiting Friday. Prepare the house.', initialState);

    const step2 = processUserMessage('Move the visit to February 31, 2026 at 5 PM', step1.nextState);

    // Must not execute any mutation tools
    expect(step2.executedTools.length).toBe(0);
    // Must clearly state why
    expect(step2.responseMessage.text.toLowerCase()).toContain('not a valid calendar date');
    // Plan target date must remain untouched
    expect(step2.nextState.activePlan?.targetDate).toBe(step1.nextState.activePlan?.targetDate);
  });

  it('Handles ambiguous rescheduling requests and past dates with helpful clarifications', () => {
    const initialState = createInitialSeedState();
    const step1 = processUserMessage('My parents are visiting Friday. Prepare the house.', initialState);

    // 1. Ambiguous query without date
    const ambiguousResult = processUserMessage('Move the visit', step1.nextState);
    expect(ambiguousResult.executedTools.length).toBe(0);
    expect(ambiguousResult.responseMessage.text.toLowerCase()).toContain('specify the exact date');

    // 2. Date in the past
    const pastResult = processUserMessage('Move the visit to 2020-01-01 at 5 PM', step1.nextState);
    expect(pastResult.executedTools.length).toBe(0);
    expect(pastResult.responseMessage.text.toLowerCase()).toContain('in the past');
  });

  it('ADD_TASK intent: Creates task without deadline and verifies it does NOT receive an invented timestamp', () => {
    const initialState = createInitialSeedState();

    // 1. Missing title asks for title
    const missingTitleResult = processUserMessage('Add task', initialState);
    expect(missingTitleResult.executedTools.length).toBe(0);
    expect(missingTitleResult.responseMessage.text.toLowerCase()).toContain('specify a title');

    // 2. Task without deadline: must NOT invent tomorrow 5 PM
    const taskResult = processUserMessage('Add task: Clean the patio furniture assigned to Sarah', initialState);
    expect(taskResult.executedTools.length).toBe(1);
    expect(taskResult.executedTools[0].toolName).toBe('tasks.createTask');
    expect(taskResult.nextState.tasks[0].title).toBe('Clean the patio furniture');
    expect(taskResult.nextState.tasks[0].assignee).toBe('Sarah');
    expect(taskResult.nextState.tasks[0].dueDate).toBeUndefined();
    expect(taskResult.responseMessage.text.toLowerCase()).toContain('no deadline assigned');
    expect(taskResult.executedTools[0].input.due).toBe('None');
  });

  it('ADD_TASK intent: Creates task with an explicit valid deadline', () => {
    const initialState = createInitialSeedState();
    const taskResult = processUserMessage(
      'Add task: Clean the patio furniture due November 14, 2026 at 5 PM assigned to Sarah',
      initialState
    );
    expect(taskResult.executedTools.length).toBe(1);
    expect(taskResult.executedTools[0].toolName).toBe('tasks.createTask');
    const createdTask = taskResult.nextState.tasks[0];
    expect(createdTask.title).toBe('Clean the patio furniture');
    expect(createdTask.assignee).toBe('Sarah');
    expect(createdTask.dueDate).toBeDefined();
    const due = new Date(createdTask.dueDate!);
    expect(due.getFullYear()).toBe(2026);
    expect(due.getMonth()).toBe(10); // November
    expect(due.getDate()).toBe(14);
    expect(due.getHours()).toBe(17);
    expect(taskResult.responseMessage.text.toLowerCase()).toContain('due:');
    expect(taskResult.responseMessage.text).toContain('Nov 14');
  });

  it('ADD_TASK intent: Rejects an impossible deadline without creating a task or successful tool call', () => {
    const initialState = createInitialSeedState();
    const taskResult = processUserMessage(
      'Add task: Clean gutters by Feb 31 at 5 PM',
      initialState
    );
    expect(taskResult.executedTools.length).toBe(0);
    expect(taskResult.nextState.tasks.length).toBe(initialState.tasks.length);
    expect(taskResult.responseMessage.text.toLowerCase()).toContain('not a valid calendar date');
    expect(taskResult.responseMessage.text).toContain('Feb 31');
  });

  it('ADD_TASK intent: Preserves assignee and priority extraction alongside deadline', () => {
    const initialState = createInitialSeedState();
    const taskResult = processUserMessage(
      'Create task: Replace water filter priority high for Vaibhav due 2026-11-20 at 10 AM',
      initialState
    );
    expect(taskResult.executedTools.length).toBe(1);
    const createdTask = taskResult.nextState.tasks[0];
    expect(createdTask.title).toBe('Replace water filter');
    expect(createdTask.assignee).toBe('Vaibhav');
    expect(createdTask.priority).toBe('high');
    expect(createdTask.completed).toBe(false);
    const due = new Date(createdTask.dueDate!);
    expect(due.getFullYear()).toBe(2026);
    expect(due.getMonth()).toBe(10);
    expect(due.getDate()).toBe(20);
    expect(due.getHours()).toBe(10);
  });

  it('ADD_TASK intent: Correctly records the created task in the tool audit trail exactly once without duplicates', () => {
    const initialState = createInitialSeedState();
    const initialHistoryLength = initialState.toolHistory.length;
    const taskResult = processUserMessage(
      'Add task: Inspect electrical panel',
      initialState
    );
    expect(taskResult.executedTools.length).toBe(1);
    expect(taskResult.nextState.toolHistory.length).toBe(initialHistoryLength + 1);
    const toolCall = taskResult.nextState.toolHistory[0];
    expect(toolCall.toolName).toBe('tasks.createTask');
    expect(toolCall.input.title).toBe('Inspect electrical panel');
    // Ensure no duplicate entries for the tool call
    const matches = taskResult.nextState.toolHistory.filter(t => t.id === toolCall.id);
    expect(matches.length).toBe(1);
  });

  it('ADD_TASK intent: Safely handles unrecognized deadline expressions without creating a task or embedding deadline in title', () => {
    const initialState = createInitialSeedState();
    const initialTasksCount = initialState.tasks.length;
    const initialToolHistoryCount = initialState.toolHistory.length;

    // 1. Unrecognized expression "in a fortnight"
    const taskResult = processUserMessage(
      'Add task: Clean the garage due in a fortnight assigned to Sarah',
      initialState
    );

    // No tool execution and no task created
    expect(taskResult.executedTools.length).toBe(0);
    expect(taskResult.nextState.tasks.length).toBe(initialTasksCount);
    expect(taskResult.nextState.toolHistory.length).toBe(initialToolHistoryCount);

    // Response asks to clarify and mentions both the clean task title and the unrecognized phrase
    expect(taskResult.responseMessage.text.toLowerCase()).toContain("couldn't understand the deadline");
    expect(taskResult.responseMessage.text).toContain('in a fortnight');
    expect(taskResult.responseMessage.text).toContain('Clean the garage');
    // Ensure the task title does not have "due in a fortnight"
    expect(taskResult.nextState.tasks.some(t => t.title.includes('fortnight'))).toBe(false);

    // 2. Unrecognized expression "deadline: soon"
    const soonResult = processUserMessage(
      'Add task: Paint the fence deadline: soon',
      initialState
    );
    expect(soonResult.executedTools.length).toBe(0);
    expect(soonResult.nextState.tasks.length).toBe(initialTasksCount);
    expect(soonResult.responseMessage.text.toLowerCase()).toContain("couldn't understand the deadline");
    expect(soonResult.responseMessage.text).toContain('soon');
    expect(soonResult.responseMessage.text).toContain('Paint the fence');
  });

  it('ADD_TASK intent: Distinguishes non-temporal "by" phrases (e.g., "by hand") and creates task without deadline', () => {
    const initialState = createInitialSeedState();
    const taskResult = processUserMessage(
      'Add task: Clean the patio furniture by hand',
      initialState
    );
    expect(taskResult.executedTools.length).toBe(1);
    expect(taskResult.executedTools[0].toolName).toBe('tasks.createTask');
    expect(taskResult.nextState.tasks[0].title).toBe('Clean the patio furniture by hand');
    expect(taskResult.nextState.tasks[0].dueDate).toBeUndefined();
    expect(taskResult.responseMessage.text.toLowerCase()).toContain('no deadline assigned');
  });

  it('CREATE_CALENDAR_EVENT intent: Creates calendar event with explicit date/time, asks if details missing', () => {
    const initialState = createInitialSeedState();

    // 1. Missing date/time
    const missingDetailsResult = processUserMessage('Schedule event: Dentist appointment', initialState);
    expect(missingDetailsResult.executedTools.length).toBe(0);
    expect(missingDetailsResult.responseMessage.text.toLowerCase()).toContain('provide a title and date/time');

    // 2. Valid calendar event
    const eventResult = processUserMessage('Schedule event: Dentist appointment on Nov 15 at 3 PM', initialState);
    expect(eventResult.executedTools.length).toBe(1);
    expect(eventResult.executedTools[0].toolName).toBe('calendar.createEvent');
    expect(eventResult.nextState.events[0].title).toBe('Dentist appointment');
    const eventStart = new Date(eventResult.nextState.events[0].start);
    expect(eventStart.getMonth()).toBe(10); // November
    expect(eventStart.getDate()).toBe(15);
    expect(eventStart.getHours()).toBe(15); // 3 PM
  });

  it('Resets demo state cleanly after executing all 3 guided scenarios', () => {
    const state0 = createInitialSeedState();

    // Run scenario 1
    const s1 = processUserMessage('My parents are visiting Friday. Prepare the house.', state0);
    // Run scenario 2
    const s2 = processUserMessage("Actually, they're arriving Saturday at 5 PM.", s1.nextState);
    // Run scenario 3
    const s3 = processUserMessage('What still needs doing before they arrive?', s2.nextState);

    expect(s3.nextState.activePlan).not.toBeNull();
    expect(s3.nextState.toolHistory.length).toBe(8); // 4 + 3 + 1

    // Reset demo
    const reset = resetDemoState();
    expect(reset.activePlan).toBeNull();
    expect(reset.toolHistory.length).toBe(0);
    expect(reset.tasks.length).toBe(2); // Seed tasks restored
    expect(reset.events.length).toBe(2); // Seed events restored
    expect(reset.routines.length).toBe(1); // Seed routine restored
  });
});
