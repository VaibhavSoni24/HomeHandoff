import { 
  HouseholdState, 
  ToolCall, 
  Plan, 
  Task, 
  CalendarEvent, 
  ShoppingItem, 
  SmartRoutine,
  ChatMessage,
  PlanSummary
} from '../types/household';
import { getUpcomingDayOfWeek, formatDateTime, formatDateShort } from '../utils/dateUtils';

export interface AgentExecutionResult {
  nextState: HouseholdState;
  responseMessage: ChatMessage;
  executedTools: ToolCall[];
}

/**
 * Heuristic & NLP Intent classification
 */
export type RecognizedIntent = 
  | 'SCENARIO_1_PARENTS_VISIT'
  | 'SCENARIO_2_RESCHEDULE_SATURDAY'
  | 'SCENARIO_3_STATUS_QUERY'
  | 'ADD_SHOPPING_ITEM'
  | 'ADD_TASK'
  | 'CREATE_CALENDAR_EVENT'
  | 'GENERIC_HELP';

export function classifyIntent(query: string, state: HouseholdState): { intent: RecognizedIntent; params: Record<string, any> } {
  const q = query.trim().toLowerCase();

  // Scenario 2: Rescheduling arriving Saturday / 5pm / etc.
  if (
    (q.includes('actually') && (q.includes('saturday') || q.includes('5') || q.includes('arrive') || q.includes('arriving'))) ||
    (q.includes('arriving saturday') || q.includes('arrive saturday') || q.includes('saturday at 5') || q.includes('saturday 5pm') || q.includes('saturday 5 pm') || q.includes('delay to saturday') || q.includes('move to saturday') || q.includes('reschedule to saturday'))
  ) {
    return {
      intent: 'SCENARIO_2_RESCHEDULE_SATURDAY',
      params: {
        day: 'Saturday',
        time: '5:00 PM',
        hour: 17,
        minute: 0
      }
    };
  }

  // Scenario 3: Query remaining items before arrival
  if (
    q.includes('what still needs doing') ||
    q.includes('what needs doing') ||
    q.includes('what is left') ||
    q.includes("what's left") ||
    q.includes('what still needs to be done') ||
    q.includes('status before they arrive') ||
    q.includes('readiness report') ||
    q.includes('remaining tasks') ||
    q.includes('checklist status') ||
    (q.includes('needs doing') && q.includes('arrive'))
  ) {
    return {
      intent: 'SCENARIO_3_STATUS_QUERY',
      params: {}
    };
  }

  // Scenario 1: Parents visiting Friday / prepare house
  if (
    (q.includes('parent') || q.includes('mom') || q.includes('dad') || q.includes('in-law') || q.includes('family')) &&
    (q.includes('visiting') || q.includes('visit') || q.includes('coming') || q.includes('friday') || q.includes('prepare') || q.includes('prep') || q.includes('house'))
  ) {
    return {
      intent: 'SCENARIO_1_PARENTS_VISIT',
      params: {
        day: 'Friday',
        targetHour: 18
      }
    };
  }

  // Quick fallback: if user types "prepare house" or "parents visit"
  if (q.includes('prepare the house') || q.includes('prepare house') || q.includes('parents are visiting')) {
    return {
      intent: 'SCENARIO_1_PARENTS_VISIT',
      params: { day: 'Friday', targetHour: 18 }
    };
  }

  // Direct quick commands: Add shopping item
  if (q.startsWith('add ') && (q.includes('to shopping') || q.includes('to groceries') || q.includes('to buy'))) {
    const itemName = q.replace(/^add\s+/, '').replace(/\s+to\s+(shopping|groceries|buy).*/, '');
    return {
      intent: 'ADD_SHOPPING_ITEM',
      params: { itemName }
    };
  }

  return {
    intent: 'GENERIC_HELP',
    params: {}
  };
}

/**
 * Execute tool calls and mutate state deterministically
 */
export function processUserMessage(rawQuery: string, currentState: HouseholdState): AgentExecutionResult {
  const trimmed = rawQuery.trim();
  const { intent, params } = classifyIntent(trimmed, currentState);
  const now = new Date();

  // Create user message
  const userMessage: ChatMessage = {
    id: `msg-user-${Date.now()}`,
    sender: 'user',
    text: trimmed,
    timestamp: now.toISOString()
  };

  const stateWithUserMsg: HouseholdState = {
    ...currentState,
    chatHistory: [...currentState.chatHistory, userMessage]
  };

  switch (intent) {
    case 'SCENARIO_1_PARENTS_VISIT':
      return handleScenario1ParentsVisit(stateWithUserMsg);

    case 'SCENARIO_2_RESCHEDULE_SATURDAY':
      return handleScenario2RescheduleSaturday(stateWithUserMsg, params);

    case 'SCENARIO_3_STATUS_QUERY':
      return handleScenario3StatusQuery(stateWithUserMsg);

    case 'ADD_SHOPPING_ITEM':
      return handleAddShoppingItem(stateWithUserMsg, params.itemName || 'Milk');

    default:
      return handleGenericHelp(stateWithUserMsg, trimmed);
  }
}

/**
 * SCENARIO 1: "My parents are visiting Friday. Prepare the house."
 */
function handleScenario1ParentsVisit(state: HouseholdState): AgentExecutionResult {
  const startTime = Date.now();
  const upcomingFriday = getUpcomingDayOfWeek(5, 18, 0); // Friday 6:00 PM
  const sundayDeparture = new Date(upcomingFriday);
  sundayDeparture.setDate(upcomingFriday.getDate() + 2);
  sundayDeparture.setHours(15, 0, 0, 0);

  const planId = `plan-parents-${Date.now()}`;
  const eventId = `evt-parents-${Date.now()}`;

  // 1. Tool Call: calendar.createEvent
  const calendarEvent: CalendarEvent = {
    id: eventId,
    planId,
    title: 'Parents Weekend Visit',
    start: upcomingFriday.toISOString(),
    end: sundayDeparture.toISOString(),
    type: 'visitor',
    location: 'Home - Guest Suite',
    attendees: ['Vaibhav', 'Sarah', 'Mom', 'Dad'],
    notes: 'Parents arriving for the weekend. Guest room prepared, house stocked.'
  };

  const toolCall1: ToolCall = {
    id: `tool-${Date.now()}-1`,
    timestamp: new Date().toISOString(),
    toolName: 'calendar.createEvent',
    description: 'Blocked household calendar for Parents Weekend Visit (Friday 6:00 PM – Sunday 3:00 PM)',
    input: {
      title: calendarEvent.title,
      start: calendarEvent.start,
      end: calendarEvent.end,
      attendees: calendarEvent.attendees,
      type: 'visitor'
    },
    output: {
      eventId: calendarEvent.id,
      status: 'created',
      calendarSync: 'Simulated Alexa Calendar synced with Google Calendar'
    },
    status: 'success',
    executionTimeMs: 42
  };

  // 2. Tool Call: tasks.batchCreate
  const friMorning = new Date(upcomingFriday);
  friMorning.setHours(11, 0, 0, 0);

  const friNoon = new Date(upcomingFriday);
  friNoon.setHours(13, 0, 0, 0);

  const friAfternoon = new Date(upcomingFriday);
  friAfternoon.setHours(15, 0, 0, 0);

  const friLateAfternoon = new Date(upcomingFriday);
  friLateAfternoon.setHours(16, 30, 0, 0);

  const friPreArrival = new Date(upcomingFriday);
  friPreArrival.setHours(17, 30, 0, 0);

  const newTasks: Task[] = [
    {
      id: `task-prep-${Date.now()}-1`,
      planId,
      title: 'Deep clean guest bedroom & make bed with fresh linens',
      category: 'guest_room',
      assignee: 'Sarah',
      dueDate: friMorning.toISOString(),
      priority: 'high',
      completed: false,
      estimatedMinutes: 45,
      notes: 'Use hypoallergenic guest cotton sheets and extra pillows from linen closet'
    },
    {
      id: `task-prep-${Date.now()}-2`,
      planId,
      title: 'Restock guest bathroom with clean towels, plush mats & toiletries',
      category: 'guest_room',
      assignee: 'Vaibhav',
      dueDate: friNoon.toISOString(),
      priority: 'high',
      completed: false,
      estimatedMinutes: 20,
      notes: 'Ensure new soap, shampoo, and fresh hand towels are placed'
    },
    {
      id: `task-prep-${Date.now()}-3`,
      planId,
      title: 'Pick up parents’ favorite groceries & breakfast staples',
      category: 'groceries',
      assignee: 'Vaibhav',
      dueDate: friAfternoon.toISOString(),
      priority: 'medium',
      completed: false,
      estimatedMinutes: 40,
      notes: 'Pick up items synced to shopping list before 4 PM traffic'
    },
    {
      id: `task-prep-${Date.now()}-4`,
      planId,
      title: 'Tidy entryway, clear coat rack & vacuum main living area',
      category: 'cleaning',
      assignee: 'Sarah',
      dueDate: friLateAfternoon.toISOString(),
      priority: 'medium',
      completed: false,
      estimatedMinutes: 30,
      notes: 'Make room for guest luggage in foyer'
    },
    {
      id: `task-prep-${Date.now()}-5`,
      planId,
      title: 'Verify guest Wi-Fi QR card & test smart bedroom thermostat',
      category: 'smart_home',
      assignee: 'Vaibhav',
      dueDate: friPreArrival.toISOString(),
      priority: 'low',
      completed: false,
      estimatedMinutes: 10,
      notes: 'Leave printed Wi-Fi card on guest nightstand'
    }
  ];

  const toolCall2: ToolCall = {
    id: `tool-${Date.now()}-2`,
    timestamp: new Date().toISOString(),
    toolName: 'tasks.batchCreate',
    description: `Created 5 coordinated preparation tasks across 2 household members (Sarah: 2, Vaibhav: 3)`,
    input: {
      planId,
      taskCount: newTasks.length,
      tasks: newTasks.map(t => ({ title: t.title, assignee: t.assignee, due: t.dueDate }))
    },
    output: {
      createdTaskIds: newTasks.map(t => t.id),
      totalEstimatedTimeMinutes: 145,
      status: 'scheduled'
    },
    status: 'success',
    executionTimeMs: 65
  };

  // 3. Tool Call: shopping.addItems
  const newShoppingItems: ShoppingItem[] = [
    {
      id: `shop-prep-${Date.now()}-1`,
      planId,
      name: 'Artisan sourdough bread (sliced)',
      category: 'Bakery',
      quantity: '1 loaf',
      completed: false,
      aisle: 'Aisle 2 - Bakery',
      priority: 'essential'
    },
    {
      id: `shop-prep-${Date.now()}-2`,
      planId,
      name: 'Organic whole milk (half gallon)',
      category: 'Dairy & Refrigerated',
      quantity: '1 container',
      completed: false,
      aisle: 'Aisle 7 - Dairy',
      priority: 'essential'
    },
    {
      id: `shop-prep-${Date.now()}-3`,
      planId,
      name: 'Dark roast whole bean coffee (Mom’s favorite)',
      category: 'Pantry',
      quantity: '1 bag (12oz)',
      completed: false,
      aisle: 'Aisle 5 - Coffee & Tea',
      priority: 'essential'
    },
    {
      id: `shop-prep-${Date.now()}-4`,
      planId,
      name: 'Herbal chamomile & lemon ginger tea assortment',
      category: 'Beverages',
      quantity: '1 box',
      completed: false,
      aisle: 'Aisle 5 - Coffee & Tea',
      priority: 'nice_to_have'
    },
    {
      id: `shop-prep-${Date.now()}-5`,
      planId,
      name: 'Fresh plush guest bath hand towels (White)',
      category: 'Guest Amenities',
      quantity: '2 count',
      completed: false,
      aisle: 'Aisle 12 - Home & Bath',
      priority: 'nice_to_have'
    }
  ];

  const toolCall3: ToolCall = {
    id: `tool-${Date.now()}-3`,
    timestamp: new Date().toISOString(),
    toolName: 'shopping.addItems',
    description: `Added 5 items to household grocery list tagged for Parents Visit`,
    input: {
      planId,
      items: newShoppingItems.map(i => ({ name: i.name, category: i.category, qty: i.quantity }))
    },
    output: {
      addedItemCount: newShoppingItems.length,
      syncProvider: 'Simulated Alexa Shopping List API',
      status: 'active'
    },
    status: 'success',
    executionTimeMs: 38
  };

  // 4. Tool Call: routines.scheduleSmartHomeRoutine
  const routineTriggerTime = new Date(upcomingFriday);
  routineTriggerTime.setHours(16, 30, 0, 0); // 90 min before 6 PM

  const newRoutine: SmartRoutine = {
    id: `rtn-parents-${Date.now()}`,
    planId,
    name: 'Parents Arrival Welcome Routine',
    trigger: `Friday at 4:30 PM (90 mins before arrival)`,
    triggerTime: routineTriggerTime.toISOString(),
    enabled: true,
    status: 'scheduled',
    actions: [
      {
        deviceType: 'thermostat',
        deviceName: 'Ecobee Main & Guest Room',
        actionDescription: 'Pre-condition guest bedroom to comfortable 71°F',
        targetState: { temperature: 71, mode: 'comfort' }
      },
      {
        deviceType: 'lighting',
        deviceName: 'Front Porch & Entryway Hue',
        actionDescription: 'Turn on Warm Welcome lighting scene (65% brightness)',
        targetState: { scene: 'Warm Welcome', brightness: 65, power: true }
      },
      {
        deviceType: 'lock',
        deviceName: 'Schlage Smart Door Lock',
        actionDescription: 'Generate temporary Guest Access Code (PIN: 8492) active for the weekend',
        targetState: { guestPinActive: true, pinCode: '8492' }
      },
      {
        deviceType: 'vacuum',
        deviceName: 'Roborock Vacuum',
        actionDescription: 'Run 25-minute hallway and guest suite silent run at 3:00 PM',
        targetState: { mode: 'quiet_clean', completed: false }
      }
    ]
  };

  const toolCall4: ToolCall = {
    id: `tool-${Date.now()}-4`,
    timestamp: new Date().toISOString(),
    toolName: 'routines.scheduleSmartHomeRoutine',
    description: `Scheduled Alexa+ Smart Home Routine: "Parents Arrival Welcome Routine"`,
    input: {
      routineName: newRoutine.name,
      trigger: newRoutine.trigger,
      actionCount: newRoutine.actions.length,
      devices: ['Ecobee Thermostat', 'Hue Smart Lights', 'Schlage Smart Lock', 'Roborock Vacuum']
    },
    output: {
      routineId: newRoutine.id,
      scheduledTime: routineTriggerTime.toISOString(),
      service: 'Simulated Alexa Smart Home Skill API',
      status: 'armed'
    },
    status: 'success',
    executionTimeMs: 51
  };

  // Create Plan
  const plan: Plan = {
    id: planId,
    title: 'Parents Weekend Visit Preparation',
    description: 'Autonomous multi-step home preparation for parents visiting on Friday.',
    status: 'active',
    targetEventId: eventId,
    targetDate: upcomingFriday.toISOString(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    category: 'guest_prep',
    milestones: [
      { id: 'm-1', title: 'Deep Clean Guest Suite & Bathroom', dueDate: friNoon.toISOString(), completed: false },
      { id: 'm-2', title: 'Restock Favorite Groceries & Staples', dueDate: friAfternoon.toISOString(), completed: false },
      { id: 'm-3', title: 'Smart Home Hospitality Routine Arming', dueDate: friLateAfternoon.toISOString(), completed: false },
      { id: 'm-4', title: 'Parents Arrival & Welcome', dueDate: upcomingFriday.toISOString(), completed: false }
    ]
  };

  const planSummary: PlanSummary = {
    planTitle: plan.title,
    readinessScore: 0,
    completedTasks: 0,
    totalTasks: newTasks.length,
    nextMilestone: plan.milestones[0].title,
    targetDateFormatted: formatDateTime(upcomingFriday.toISOString())
  };

  const assistantResponseText = `I've put together a complete household coordination plan for **your parents' visit this Friday at ${formatDateTime(upcomingFriday.toISOString())}**!

Here is what I've done across your household systems:
1. 📅 **Calendar:** Blocked off **Parents Weekend Visit** (Friday 6:00 PM – Sunday 3:00 PM).
2. 📋 **Tasks:** Generated **5 preparation tasks** distributed between Sarah (bedroom cleaning & entryway tidy) and Vaibhav (bathroom restock, grocery run & smart setup).
3. 🛒 **Shopping:** Synced **5 guest favorites** (sourdough, organic milk, dark roast coffee, herbal tea, plush towels) to your shopping list.
4. 🏡 **Alexa+ Smart Home Routine:** Armed **"Parents Arrival Welcome Routine"** for Friday at 4:30 PM to pre-condition the guest room to 71°F, turn on warm lighting, and activate a temporary guest lock code.

Everything is live on your dashboard and ready for tracking.`;

  const assistantMessage: ChatMessage = {
    id: `msg-asst-${Date.now()}`,
    sender: 'assistant',
    text: assistantResponseText,
    timestamp: new Date().toISOString(),
    toolCalls: [toolCall1, toolCall2, toolCall3, toolCall4],
    planSummary,
    suggestedActions: [
      "Actually, they're arriving Saturday at 5 PM.",
      "What still needs doing before they arrive?",
      "Mark guest room cleaning as done"
    ]
  };

  const nextState: HouseholdState = {
    ...state,
    activePlan: plan,
    events: [calendarEvent, ...state.events],
    tasks: [...newTasks, ...state.tasks],
    shoppingItems: [...newShoppingItems, ...state.shoppingItems],
    routines: [newRoutine, ...state.routines],
    toolHistory: [toolCall1, toolCall2, toolCall3, toolCall4, ...state.toolHistory],
    chatHistory: [...state.chatHistory, assistantMessage]
  };

  return {
    nextState,
    responseMessage: assistantMessage,
    executedTools: [toolCall1, toolCall2, toolCall3, toolCall4]
  };
}

/**
 * SCENARIO 2: "Actually, they're arriving Saturday at 5 PM."
 */
function handleScenario2RescheduleSaturday(state: HouseholdState, params: Record<string, any>): AgentExecutionResult {
  const activePlan = state.activePlan;
  const newSaturdayDate = getUpcomingDayOfWeek(6, 17, 0); // Saturday 5:00 PM
  const newSundayDate = new Date(newSaturdayDate);
  newSundayDate.setDate(newSaturdayDate.getDate() + 1);
  newSundayDate.setHours(18, 0, 0, 0);

  const planId = activePlan ? activePlan.id : `plan-parents-fallback`;

  // 1. Tool Call: calendar.updateEvent
  const targetEvent = state.events.find(e => e.planId === planId || e.title.toLowerCase().includes('parent'));
  const originalDateFormatted = targetEvent ? formatDateTime(targetEvent.start) : 'Friday 6:00 PM';

  const updatedEvents = state.events.map(e => {
    if ((targetEvent && e.id === targetEvent.id) || e.planId === planId) {
      return {
        ...e,
        start: newSaturdayDate.toISOString(),
        end: newSundayDate.toISOString(),
        notes: `${e.notes || ''} [Updated: arrival moved to Saturday 5:00 PM]`
      };
    }
    return e;
  });

  const toolCall1: ToolCall = {
    id: `tool-${Date.now()}-1`,
    timestamp: new Date().toISOString(),
    toolName: 'calendar.updateEvent',
    description: `Shifted calendar event "Parents Weekend Visit" from ${originalDateFormatted} to ${formatDateTime(newSaturdayDate.toISOString())}`,
    input: {
      eventId: targetEvent?.id || 'evt-parents',
      previousStart: targetEvent?.start,
      newStart: newSaturdayDate.toISOString(),
      newEnd: newSundayDate.toISOString()
    },
    output: {
      status: 'updated',
      deltaHours: 23,
      calendarSync: 'Simulated Alexa Calendar synced with Google Calendar'
    },
    status: 'success',
    executionTimeMs: 46
  };

  // 2. Tool Call: tasks.rescheduleAssociated
  // Shift cleaning & logistics tasks to Saturday morning/afternoon so preparation stays fresh!
  const satMorning = new Date(newSaturdayDate);
  satMorning.setHours(11, 0, 0, 0);

  const satNoon = new Date(newSaturdayDate);
  satNoon.setHours(13, 0, 0, 0);

  const satAfternoon = new Date(newSaturdayDate);
  satAfternoon.setHours(15, 0, 0, 0);

  const satLateAfternoon = new Date(newSaturdayDate);
  satLateAfternoon.setHours(16, 0, 0, 0);

  const updatedTasks = state.tasks.map(t => {
    if (t.planId === planId || t.title.toLowerCase().includes('guest') || t.title.toLowerCase().includes('parent')) {
      let newDue = satAfternoon.toISOString();
      if (t.category === 'guest_room') newDue = satMorning.toISOString();
      if (t.category === 'groceries') newDue = satNoon.toISOString();
      if (t.category === 'cleaning') newDue = satAfternoon.toISOString();
      if (t.category === 'smart_home') newDue = satLateAfternoon.toISOString();

      return {
        ...t,
        dueDate: newDue
      };
    }
    return t;
  });

  const rescheduledCount = updatedTasks.filter(t => t.planId === planId || t.title.toLowerCase().includes('guest') || t.title.toLowerCase().includes('parent')).length;

  const toolCall2: ToolCall = {
    id: `tool-${Date.now()}-2`,
    timestamp: new Date().toISOString(),
    toolName: 'tasks.rescheduleAssociated',
    description: `Rescheduled ${rescheduledCount} associated preparation tasks forward to Saturday morning/afternoon`,
    input: {
      planId,
      newArrivalTarget: newSaturdayDate.toISOString(),
      adjustmentPolicy: 'preserve_pre_arrival_buffers'
    },
    output: {
      rescheduledCount,
      freshnessWindowPreserved: true,
      groceryRunShiftedTo: formatDateTime(satNoon.toISOString())
    },
    status: 'success',
    executionTimeMs: 58
  };

  // 3. Tool Call: routines.updateRoutineTrigger
  const newRoutineTriggerTime = new Date(newSaturdayDate);
  newRoutineTriggerTime.setHours(15, 30, 0, 0); // 90 min before Saturday 5:00 PM

  const updatedRoutines = state.routines.map(r => {
    if (r.planId === planId || r.name.toLowerCase().includes('parent')) {
      return {
        ...r,
        trigger: 'Saturday at 3:30 PM (90 mins before arrival)',
        triggerTime: newRoutineTriggerTime.toISOString(),
        status: 'scheduled' as const
      };
    }
    return r;
  });

  const toolCall3: ToolCall = {
    id: `tool-${Date.now()}-3`,
    timestamp: new Date().toISOString(),
    toolName: 'routines.updateRoutineTrigger',
    description: `Updated "Parents Arrival Welcome Routine" trigger to Saturday at 3:30 PM`,
    input: {
      routineName: 'Parents Arrival Welcome Routine',
      newTriggerTime: newRoutineTriggerTime.toISOString(),
      preConditionBufferMinutes: 90
    },
    output: {
      status: 'rescheduled',
      deviceTarget: 'Thermostat 71°F, Hue Warm Welcome, Guest PIN activated Saturday afternoon'
    },
    status: 'success',
    executionTimeMs: 34
  };

  // Update Plan milestones and targetDate
  let updatedPlan: Plan | null = null;
  if (activePlan) {
    updatedPlan = {
      ...activePlan,
      targetDate: newSaturdayDate.toISOString(),
      updatedAt: new Date().toISOString(),
      milestones: activePlan.milestones.map(m => {
        if (m.title.toLowerCase().includes('clean')) return { ...m, dueDate: satMorning.toISOString() };
        if (m.title.toLowerCase().includes('grocer')) return { ...m, dueDate: satNoon.toISOString() };
        if (m.title.toLowerCase().includes('routine') || m.title.toLowerCase().includes('smart')) return { ...m, dueDate: satLateAfternoon.toISOString() };
        if (m.title.toLowerCase().includes('arrival')) return { ...m, dueDate: newSaturdayDate.toISOString() };
        return m;
      })
    };
  }

  // Calculate readiness summary
  const planTasks = updatedTasks.filter(t => t.planId === planId);
  const completedCount = planTasks.filter(t => t.completed).length;
  const readiness = planTasks.length > 0 ? Math.round((completedCount / planTasks.length) * 100) : 0;

  const planSummary: PlanSummary = {
    planTitle: updatedPlan ? updatedPlan.title : 'Parents Weekend Visit Preparation',
    readinessScore: readiness,
    completedTasks: completedCount,
    totalTasks: planTasks.length,
    nextMilestone: 'Deep Clean Guest Suite (Saturday 11:00 AM)',
    targetDateFormatted: formatDateTime(newSaturdayDate.toISOString())
  };

  const assistantResponseText = `Understood! I've dynamically updated your preparation plan for **Saturday at 5:00 PM** (${formatDateShort(newSaturdayDate.toISOString())}).

Here is what was automatically adjusted:
1. 📅 **Calendar:** Moved **Parents Weekend Visit** from Friday to **Saturday at 5:00 PM**.
2. 📋 **Tasks & Deadlines:** Shifted **${rescheduledCount} preparation tasks** into Saturday morning/afternoon so your groceries stay fresh and the house stays spotless right before arrival.
3. 🏡 **Alexa+ Smart Home Routine:** Rescheduled the **Parents Arrival Welcome Routine** to trigger at **Saturday 3:30 PM** (90 minutes before they arrive).

You now have an extra day of buffer!`;

  const assistantMessage: ChatMessage = {
    id: `msg-asst-${Date.now()}`,
    sender: 'assistant',
    text: assistantResponseText,
    timestamp: new Date().toISOString(),
    toolCalls: [toolCall1, toolCall2, toolCall3],
    planSummary,
    suggestedActions: [
      'What still needs doing before they arrive?',
      'Show my Saturday preparation timeline',
      'Mark grocery shopping as completed'
    ]
  };

  const nextState: HouseholdState = {
    ...state,
    activePlan: updatedPlan || state.activePlan,
    events: updatedEvents,
    tasks: updatedTasks,
    routines: updatedRoutines,
    toolHistory: [toolCall1, toolCall2, toolCall3, ...state.toolHistory],
    chatHistory: [...state.chatHistory, assistantMessage]
  };

  return {
    nextState,
    responseMessage: assistantMessage,
    executedTools: [toolCall1, toolCall2, toolCall3]
  };
}

/**
 * SCENARIO 3: "What still needs doing before they arrive?"
 */
function handleScenario3StatusQuery(state: HouseholdState): AgentExecutionResult {
  const activePlan = state.activePlan;
  const planId = activePlan ? activePlan.id : undefined;

  // 1. Tool Call: agent.inspectState
  const relevantTasks = state.tasks.filter(t => 
    (planId && t.planId === planId) || 
    t.title.toLowerCase().includes('guest') || 
    t.title.toLowerCase().includes('parent') ||
    t.category === 'guest_room'
  );

  const completedTasks = relevantTasks.filter(t => t.completed);
  const pendingTasks = relevantTasks.filter(t => !t.completed);

  const pendingShopping = state.shoppingItems.filter(s => 
    (!s.completed) && 
    ((planId && s.planId === planId) || s.category === 'Guest Amenities' || s.name.toLowerCase().includes('bread') || s.name.toLowerCase().includes('milk'))
  );

  const targetDateStr = activePlan ? activePlan.targetDate : getUpcomingDayOfWeek(6, 17, 0).toISOString();
  const readinessPercent = relevantTasks.length > 0 
    ? Math.round((completedTasks.length / relevantTasks.length) * 100) 
    : 40;

  const toolCall1: ToolCall = {
    id: `tool-${Date.now()}-1`,
    timestamp: new Date().toISOString(),
    toolName: 'agent.inspectState',
    description: `Inspected state for active plan "${activePlan?.title || 'Parents Visit'}": evaluated ${relevantTasks.length} tasks and ${pendingShopping.length} shopping items`,
    input: {
      planId: activePlan?.id || 'all_guest_items',
      filter: 'pending_before_arrival',
      targetArrivalDate: targetDateStr
    },
    output: {
      totalRelevantTasks: relevantTasks.length,
      completedTaskCount: completedTasks.length,
      pendingTaskCount: pendingTasks.length,
      pendingShoppingCount: pendingShopping.length,
      readinessScorePercent: readinessPercent
    },
    status: 'success',
    executionTimeMs: 29
  };

  // Group pending tasks by assignee
  const tasksByAssignee: Record<string, Task[]> = {};
  for (const task of pendingTasks) {
    if (!tasksByAssignee[task.assignee]) {
      tasksByAssignee[task.assignee] = [];
    }
    tasksByAssignee[task.assignee].push(task);
  }

  let breakdownText = '';
  if (pendingTasks.length === 0) {
    breakdownText = `🎉 **Everything is complete!** All preparation tasks have been checked off. The house is 100% ready for arrival at ${formatDateTime(targetDateStr)}.`;
  } else {
    breakdownText = `Here is the current preparation status before arrival (**${formatDateTime(targetDateStr)}**):\n\n` +
      `📊 **Readiness Score:** **${readinessPercent}%** (${completedTasks.length} of ${relevantTasks.length} tasks complete)\n\n` +
      `### Incomplete Tasks by Household Member:\n`;

    for (const [assignee, tasks] of Object.entries(tasksByAssignee)) {
      breakdownText += `**👤 ${assignee} (${tasks.length} remaining):**\n`;
      for (const t of tasks) {
        breakdownText += `- [ ] **${t.title}** *(Due: ${formatDateTime(t.dueDate)}, ~${t.estimatedMinutes}m)*\n`;
      }
      breakdownText += '\n';
    }

    if (pendingShopping.length > 0) {
      breakdownText += `### 🛒 Unpurchased Grocery & Guest Items (${pendingShopping.length}):\n`;
      for (const item of pendingShopping.slice(0, 4)) {
        breakdownText += `- ${item.name} (${item.quantity}) — *${item.aisle || item.category}*\n`;
      }
      if (pendingShopping.length > 4) {
        breakdownText += `- *...and ${pendingShopping.length - 4} more on the Shopping tab*\n`;
      }
      breakdownText += '\n';
    }

    breakdownText += `⚡ **Smart Home Status:** The *Parents Arrival Welcome Routine* is armed and will automatically pre-cool the house to 71°F and set welcoming lights 90 minutes before arrival.`;
  }

  const planSummary: PlanSummary = {
    planTitle: activePlan?.title || 'Parents Weekend Visit Preparation',
    readinessScore: readinessPercent,
    completedTasks: completedTasks.length,
    totalTasks: relevantTasks.length,
    nextMilestone: pendingTasks[0] ? pendingTasks[0].title : 'Parents Arrival & Welcome',
    targetDateFormatted: formatDateTime(targetDateStr)
  };

  const assistantMessage: ChatMessage = {
    id: `msg-asst-${Date.now()}`,
    sender: 'assistant',
    text: breakdownText,
    timestamp: new Date().toISOString(),
    toolCalls: [toolCall1],
    planSummary,
    suggestedActions: [
      pendingTasks[0] ? `Mark "${pendingTasks[0].title.slice(0, 30)}..." complete` : 'Check all tasks',
      'Go to Shopping List',
      'View Calendar'
    ]
  };

  const nextState: HouseholdState = {
    ...state,
    toolHistory: [toolCall1, ...state.toolHistory],
    chatHistory: [...state.chatHistory, assistantMessage]
  };

  return {
    nextState,
    responseMessage: assistantMessage,
    executedTools: [toolCall1]
  };
}

/**
 * Handle custom shopping item addition
 */
function handleAddShoppingItem(state: HouseholdState, itemName: string): AgentExecutionResult {
  const newItem: ShoppingItem = {
    id: `shop-custom-${Date.now()}`,
    planId: state.activePlan?.id,
    name: itemName,
    category: 'Pantry',
    quantity: '1',
    completed: false,
    aisle: 'Aisle 3 - General',
    priority: 'essential'
  };

  const toolCall: ToolCall = {
    id: `tool-${Date.now()}-1`,
    timestamp: new Date().toISOString(),
    toolName: 'shopping.addItems',
    description: `Added "${itemName}" to household shopping list`,
    input: { name: itemName, category: 'Pantry', quantity: '1' },
    output: { itemId: newItem.id, status: 'added' },
    status: 'success',
    executionTimeMs: 25
  };

  const assistantMessage: ChatMessage = {
    id: `msg-asst-${Date.now()}`,
    sender: 'assistant',
    text: `Added **${itemName}** to your household shopping list!`,
    timestamp: new Date().toISOString(),
    toolCalls: [toolCall],
    suggestedActions: [
      'What still needs doing before they arrive?',
      'View Shopping List'
    ]
  };

  const nextState: HouseholdState = {
    ...state,
    shoppingItems: [newItem, ...state.shoppingItems],
    toolHistory: [toolCall, ...state.toolHistory],
    chatHistory: [...state.chatHistory, assistantMessage]
  };

  return {
    nextState,
    responseMessage: assistantMessage,
    executedTools: [toolCall]
  };
}

/**
 * Handle generic query / help
 */
function handleGenericHelp(state: HouseholdState, query: string): AgentExecutionResult {
  const assistantMessage: ChatMessage = {
    id: `msg-asst-${Date.now()}`,
    sender: 'assistant',
    text: `I'm your **HomeHandoff** household coordination agent. I coordinate multi-step household projects across calendar, tasks, shopping, and Alexa+ smart devices.

Here are the 3 main hackathon scenarios you can trigger:
1. **"My parents are visiting Friday. Prepare the house."** — Creates a synchronized preparation plan with calendar blocks, chores, grocery shopping, and smart home routines.
2. **"Actually, they're arriving Saturday at 5 PM."** — Intelligently reschedules the visit, recalibrates task deadlines, and shifts smart home triggers while preserving prep buffers.
3. **"What still needs doing before they arrive?"** — Inspects current completion states and generates an executive readiness report.`,
    timestamp: new Date().toISOString(),
    suggestedActions: [
      'My parents are visiting Friday. Prepare the house.',
      "Actually, they're arriving Saturday at 5 PM.",
      'What still needs doing before they arrive?'
    ]
  };

  const nextState: HouseholdState = {
    ...state,
    chatHistory: [...state.chatHistory, assistantMessage]
  };

  return {
    nextState,
    responseMessage: assistantMessage,
    executedTools: []
  };
}

/**
 * Direct task toggle mutation that also generates an execution trace if requested
 */
export function toggleTaskInState(state: HouseholdState, taskId: string): HouseholdState {
  let toggledTitle = '';
  let newStatus = false;

  const updatedTasks = state.tasks.map(t => {
    if (t.id === taskId) {
      newStatus = !t.completed;
      toggledTitle = t.title;
      return { ...t, completed: newStatus };
    }
    return t;
  });

  const toolCall: ToolCall = {
    id: `tool-${Date.now()}-toggle`,
    timestamp: new Date().toISOString(),
    toolName: 'tasks.toggleComplete',
    description: `Toggled task completion for "${toggledTitle}" -> ${newStatus ? 'COMPLETED' : 'PENDING'}`,
    input: { taskId, targetCompleted: newStatus },
    output: { taskId, completed: newStatus, status: 'updated' },
    status: 'success',
    executionTimeMs: 18
  };

  return {
    ...state,
    tasks: updatedTasks,
    toolHistory: [toolCall, ...state.toolHistory]
  };
}

/**
 * Direct shopping item toggle mutation
 */
export function toggleShoppingItemInState(state: HouseholdState, itemId: string): HouseholdState {
  const updatedItems = state.shoppingItems.map(item => {
    if (item.id === itemId) {
      return { ...item, completed: !item.completed };
    }
    return item;
  });

  return {
    ...state,
    shoppingItems: updatedItems
  };
}

/**
 * Direct routine toggle mutation
 */
export function toggleRoutineInState(state: HouseholdState, routineId: string): HouseholdState {
  const updatedRoutines = state.routines.map(r => {
    if (r.id === routineId) {
      return { ...r, enabled: !r.enabled };
    }
    return r;
  });

  return {
    ...state,
    routines: updatedRoutines
  };
}
