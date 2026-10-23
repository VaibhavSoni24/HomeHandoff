import type { 
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
import { 
  getUpcomingDayOfWeek, 
  getRescheduledDateForPlan, 
  parseExplicitDate,
  detectImpossibleDate,
  formatDateTime, 
  formatDateShort,
  formatTimeOnly
} from '../utils/dateUtils';
import { computePlanReadiness } from '../utils/readiness';

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

  // 0. Check for impossible calendar date (e.g., Feb 31, April 31)
  const impossibleCheck = detectImpossibleDate(q);
  if (impossibleCheck.isImpossible) {
    return {
      intent: 'SCENARIO_2_RESCHEDULE_SATURDAY',
      params: {
        isImpossibleDate: true,
        invalidDateDesc: impossibleCheck.description
      }
    };
  }

  // 1. Scenario 2: Rescheduling arriving Saturday / explicit date / etc.
  const hasRescheduleVerb = 
    q.includes('actually') || 
    q.includes('reschedule') || 
    q.includes('postpone') || 
    q.includes('delay') || 
    q.includes('move to') || 
    q.includes('moved to') ||
    q.includes('move the visit') ||
    q.includes('move visit') ||
    q.includes('change to') ||
    q.includes('change arrival') ||
    q.startsWith('move ');

  const hasSaturdayTarget = 
    q.includes('saturday') || 
    q.includes('sat at 5') || 
    q.includes('sat 5pm') ||
    q.includes('saturday at 5') ||
    q.includes('saturday 5');

  const hasArrivalSubject = 
    q.includes('they') || 
    q.includes('arrive') || 
    q.includes('arriving') || 
    q.includes('parents') || 
    q.includes('visit') ||
    q.includes('coming');

  if (
    (hasRescheduleVerb && hasSaturdayTarget) ||
    (hasSaturdayTarget && (hasArrivalSubject || q.includes('5 pm') || q.includes('5pm') || q.includes('5:00'))) ||
    (q.includes('arriving saturday') || q.includes('arrive saturday') || q.includes('actually, they') || q.includes('actually they'))
  ) {
    return {
      intent: 'SCENARIO_2_RESCHEDULE_SATURDAY',
      params: {
        day: 'Saturday',
        time: '5:00 PM',
        hour: 17,
        minute: 0,
        hasActivePlan: !!state.activePlan
      }
    };
  }

  // Check explicit calendar date for rescheduling (e.g., "Move the visit to November 14, 2026 at 5 PM", "Reschedule arrival to 2026-11-20 at 6 PM")
  if (hasRescheduleVerb) {
    const explicitDate = parseExplicitDate(query, new Date(), 17, 0);
    if (explicitDate) {
      return {
        intent: 'SCENARIO_2_RESCHEDULE_SATURDAY',
        params: {
          explicitDate: explicitDate.toISOString(),
          hasActivePlan: !!state.activePlan
        }
      };
    }

    // If reschedule verb was used without Saturday or valid date, flag as ambiguous
    if (hasArrivalSubject || q.includes('visit') || q.includes('arrival') || q.includes('plan')) {
      return {
        intent: 'SCENARIO_2_RESCHEDULE_SATURDAY',
        params: {
          isAmbiguous: true,
          hasActivePlan: !!state.activePlan
        }
      };
    }
  }

  // 2. Scenario 3: Query remaining chores, readiness report, or prep status
  const isStatusQuery = 
    q.includes('what still needs doing') ||
    q.includes('what needs doing') ||
    q.includes('what is left') ||
    q.includes("what's left") ||
    q.includes('what still needs to be done') ||
    q.includes('status before they arrive') ||
    q.includes('readiness report') ||
    q.includes('readiness score') ||
    q.includes('how ready is the house') ||
    q.includes('remaining tasks') ||
    q.includes('checklist status') ||
    q.includes('preparation status') ||
    ((q.includes('needs doing') || q.includes('left to do')) && (q.includes('arrive') || q.includes('arrival') || q.includes('visit') || q.includes('before')));

  if (isStatusQuery) {
    return {
      intent: 'SCENARIO_3_STATUS_QUERY',
      params: {}
    };
  }

  // 3. Scenario 1: Parents / guests visiting Friday & prepare house
  const hasGuestSubject = 
    q.includes('parent') || 
    q.includes('parents') || 
    q.includes('mom and dad') || 
    q.includes('in-law') || 
    q.includes('inlaws') || 
    q.includes('family') ||
    q.includes('visitors') ||
    q.includes('guests');

  const hasVisitTiming = 
    q.includes('friday') || 
    q.includes('weekend') || 
    q.includes('visiting') || 
    q.includes('coming');

  const hasPrepAction = 
    q.includes('prepare') || 
    q.includes('prep') || 
    q.includes('get ready') || 
    q.includes('organize') || 
    q.includes('clean') ||
    q.includes('plan');

  if (
    (hasGuestSubject && (hasVisitTiming || hasPrepAction)) ||
    (q.includes('prepare the house') || q.includes('prepare house') || q.includes('parents are visiting') || q.includes('parents visit friday'))
  ) {
    return {
      intent: 'SCENARIO_1_PARENTS_VISIT',
      params: {
        day: 'Friday',
        targetHour: 18
      }
    };
  }

  // 4. Utility command: Add / Create Task
  const isAddTaskCmd = 
    q.startsWith('add task') || 
    q.startsWith('create task') || 
    q.startsWith('new task') || 
    q.startsWith('add chore') || 
    q.startsWith('create chore');

  if (isAddTaskCmd) {
    let taskBody = query.trim()
      .replace(/^(add|create|new)\s+(task|chore)[:\s]*/i, '')
      .trim();

    if (!taskBody) {
      return {
        intent: 'ADD_TASK',
        params: { needsTitle: true }
      };
    }

    // Extract optional assignee: e.g. "assigned to Sarah", "for Vaibhav", "by Sarah"
    let assignee = 'Shared';
    const assigneeMatch = taskBody.match(/\s+(?:assigned to|for|by)\s+(sarah|vaibhav|guest room)\b/i);
    if (assigneeMatch) {
      const rawAssignee = assigneeMatch[1].toLowerCase();
      if (rawAssignee === 'sarah') assignee = 'Sarah';
      else if (rawAssignee === 'vaibhav') assignee = 'Vaibhav';
      else if (rawAssignee.includes('guest')) assignee = 'Guest Room (Parents)';
      taskBody = taskBody.replace(assigneeMatch[0], '').trim();
    }

    // Extract optional priority
    let priority: 'high' | 'medium' | 'low' = 'medium';
    if (/\b(urgent|high priority|priority high)\b/i.test(taskBody)) {
      priority = 'high';
      taskBody = taskBody.replace(/\b(urgent|high priority|priority high)\b/i, '').trim();
    } else if (/\b(low priority|priority low)\b/i.test(taskBody)) {
      priority = 'low';
      taskBody = taskBody.replace(/\b(low priority|priority low)\b/i, '').trim();
    }

    return {
      intent: 'ADD_TASK',
      params: {
        title: taskBody,
        assignee,
        priority
      }
    };
  }

  // 5. Utility command: Create / Schedule Calendar Event
  const isCreateEventCmd = 
    q.startsWith('create event') || 
    q.startsWith('schedule event') || 
    q.startsWith('add event') || 
    q.startsWith('book event') ||
    q.startsWith('create calendar event') ||
    q.startsWith('schedule calendar event');

  if (isCreateEventCmd) {
    let eventBody = query.trim()
      .replace(/^(create|schedule|add|book)\s+(?:calendar\s+)?event[:\s]*/i, '')
      .trim();

    if (!eventBody) {
      return {
        intent: 'CREATE_CALENDAR_EVENT',
        params: { needsDetails: true }
      };
    }

    const parsedEventDate = parseExplicitDate(eventBody, new Date(), 10, 0);
    if (!parsedEventDate) {
      return {
        intent: 'CREATE_CALENDAR_EVENT',
        params: { needsDetails: true, title: eventBody }
      };
    }

    let title = eventBody
      .replace(/\s+(on|for|at)\s+(jan|january|feb|february|mar|march|apr|april|may|jun|june|jul|july|aug|august|sep|sept|september|oct|october|nov|november|dec|december|\d{4}-\d{1,2}-\d{1,2}).*/i, '')
      .trim();

    if (!title) {
      title = 'Household Calendar Event';
    }

    return {
      intent: 'CREATE_CALENDAR_EVENT',
      params: {
        title,
        startDate: parsedEventDate.toISOString()
      }
    };
  }

  // 6. Quick utility commands: Add shopping item
  if (q.startsWith('add ') && (q.includes('to shopping') || q.includes('to groceries') || q.includes('to buy') || q.includes('to list'))) {
    const itemName = q
      .replace(/^add\s+/, '')
      .replace(/\s+to\s+(shopping|groceries|buy|the\s+shopping|list).*/, '')
      .trim();
    if (itemName) {
      return {
        intent: 'ADD_SHOPPING_ITEM',
        params: { itemName }
      };
    }
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
      return handleAddShoppingItem(stateWithUserMsg, params.itemName || 'Fresh Milk');

    case 'ADD_TASK':
      return handleAddTask(stateWithUserMsg, params);

    case 'CREATE_CALENDAR_EVENT':
      return handleCreateCalendarEvent(stateWithUserMsg, params);

    default:
      return handleGenericHelp(stateWithUserMsg, trimmed);
  }
}

/**
 * SCENARIO 1: "My parents are visiting Friday. Prepare the house."
 */
function handleScenario1ParentsVisit(state: HouseholdState): AgentExecutionResult {
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
      calendarSync: 'Committed to simulated household calendar (client simulation)',
      simulatedLatencyMs: 42
    },
    status: 'success',
    executionTimeMs: 42
  };

  // 2. Tool Call: tasks.batchCreate
  const friMorning = new Date(upcomingFriday); friMorning.setHours(11, 0, 0, 0);
  const friNoon = new Date(upcomingFriday); friNoon.setHours(13, 0, 0, 0);
  const friAfternoon = new Date(upcomingFriday); friAfternoon.setHours(15, 0, 0, 0);
  const friLateAfternoon = new Date(upcomingFriday); friLateAfternoon.setHours(16, 30, 0, 0);
  const friPreArrival = new Date(upcomingFriday); friPreArrival.setHours(17, 30, 0, 0);

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
      status: 'scheduled',
      simulatedLatencyMs: 65
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
      status: 'active',
      simulatedLatencyMs: 38
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
        actionDescription: 'Generate temporary simulated guest access pass [SIMULATED-CODE-NOT-ISSUED] (No physical lock contacted)',
        targetState: { guestPinActive: true, pinCode: 'SIMULATED-CODE-NOT-ISSUED', simulated: true }
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
    description: `Scheduled Alexa+ Smart Home Routine: "Parents Arrival Welcome Routine" [SIMULATED-CODE-NOT-ISSUED]`,
    input: {
      routineName: newRoutine.name,
      trigger: newRoutine.trigger,
      actionCount: newRoutine.actions.length,
      devices: ['Ecobee Thermostat', 'Hue Smart Lights', 'Schlage Smart Lock', 'Roborock Vacuum']
    },
    output: {
      routineId: newRoutine.id,
      scheduledTime: routineTriggerTime.toISOString(),
      service: 'Simulated Alexa Smart Home Skill API (client simulation — no physical lock contacted)',
      simulatedAccessPass: 'SIMULATED-CODE-NOT-ISSUED',
      status: 'armed',
      simulatedLatencyMs: 51
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
4. 🏡 **Alexa+ Smart Home Routine:** Armed **"Parents Arrival Welcome Routine"** for Friday at 4:30 PM to pre-condition the guest room to 71°F, turn on warm lighting, and arm simulated guest lock pass (SIMULATED-CODE-NOT-ISSUED; no physical lock contacted).

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
      "View Chores & Tasks"
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
 * SCENARIO 2: Rescheduling (Saturday or explicit calendar date)
 */
function handleScenario2RescheduleSaturday(state: HouseholdState, params: Record<string, any>): AgentExecutionResult {
  // 1. Check for impossible calendar date (e.g., February 31, April 31)
  if (params.isImpossibleDate) {
    const errorText = `I couldn't reschedule the visit because **${params.invalidDateDesc || 'the specified date'}** is not a valid calendar date. Please specify a valid date (e.g., *"Move the visit to November 14, 2026 at 5 PM"*).`;
    const assistantMessage: ChatMessage = {
      id: `msg-asst-${Date.now()}`,
      sender: 'assistant',
      text: errorText,
      timestamp: new Date().toISOString(),
      suggestedActions: [
        "Actually, they're arriving Saturday at 5 PM.",
        'What still needs doing before they arrive?'
      ]
    };
    return {
      nextState: {
        ...state,
        chatHistory: [...state.chatHistory, assistantMessage]
      },
      responseMessage: assistantMessage,
      executedTools: []
    };
  }

  // 2. Check for ambiguous rescheduling request
  if (params.isAmbiguous) {
    const clarificationText = "Could you please specify the exact date and time for the visit? For example, you can say:\n- *\"Move the visit to Saturday at 5 PM\"*\n- *\"Move the visit to November 14, 2026 at 5 PM\"*";
    const assistantMessage: ChatMessage = {
      id: `msg-asst-${Date.now()}`,
      sender: 'assistant',
      text: clarificationText,
      timestamp: new Date().toISOString(),
      suggestedActions: [
        "Actually, they're arriving Saturday at 5 PM.",
        'What still needs doing before they arrive?'
      ]
    };
    return {
      nextState: {
        ...state,
        chatHistory: [...state.chatHistory, assistantMessage]
      },
      responseMessage: assistantMessage,
      executedTools: []
    };
  }

  const activePlan = state.activePlan;

  // 3. Handle missing active plan gracefully
  if (!activePlan) {
    const assistantMessage: ChatMessage = {
      id: `msg-asst-${Date.now()}`,
      sender: 'assistant',
      text: "I noticed you would like to reschedule an arrival, but there is no active visit plan currently in your household dashboard.\n\nWould you like me to create a preparation plan for your parents' visit first?",
      timestamp: new Date().toISOString(),
      suggestedActions: [
        'My parents are visiting Friday. Prepare the house.',
        'View Household Dashboard'
      ]
    };

    return {
      nextState: {
        ...state,
        chatHistory: [...state.chatHistory, assistantMessage]
      },
      responseMessage: assistantMessage,
      executedTools: []
    };
  }

  // 4. Resolve target date (explicit calendar date or Saturday relative to plan)
  let targetStartDate: Date;
  if (params.explicitDate) {
    targetStartDate = new Date(params.explicitDate);
    // Reject dates in the past
    if (targetStartDate.getTime() < Date.now() - 60 * 1000) {
      const pastMsgText = `The requested date (**${formatDateTime(targetStartDate.toISOString())}**) is in the past. Please specify an upcoming date and time for the visit.`;
      const assistantMessage: ChatMessage = {
        id: `msg-asst-${Date.now()}`,
        sender: 'assistant',
        text: pastMsgText,
        timestamp: new Date().toISOString(),
        suggestedActions: [
          "Actually, they're arriving Saturday at 5 PM.",
          'What still needs doing before they arrive?'
        ]
      };
      return {
        nextState: {
          ...state,
          chatHistory: [...state.chatHistory, assistantMessage]
        },
        responseMessage: assistantMessage,
        executedTools: []
      };
    }
  } else {
    // Default Saturday 5:00 PM relative to active visit plan
    targetStartDate = getRescheduledDateForPlan(activePlan.targetDate, 6, 17, 0);
  }

  const planId = activePlan.id;

  // 5. Tool Call: calendar.updateEvent
  // Find intended target visit event
  const targetEvent = state.events.find(
    e => (activePlan.targetEventId && e.id === activePlan.targetEventId) || (e.planId === planId && e.type === 'visitor')
  );
  const targetEventId = targetEvent ? targetEvent.id : activePlan.targetEventId;
  const originalDateFormatted = targetEvent ? formatDateTime(targetEvent.start) : 'Friday 6:00 PM';

  // Preserve target event duration
  const originalDurationMs = targetEvent
    ? (new Date(targetEvent.end).getTime() - new Date(targetEvent.start).getTime())
    : (45 * 60 * 60 * 1000); // 45 hours default
  const durationMs = originalDurationMs > 0 ? originalDurationMs : (45 * 60 * 60 * 1000);
  const targetEndDate = new Date(targetStartDate.getTime() + durationMs);

  // Update ONLY the target event; do NOT overwrite unrelated events
  const updatedEvents = state.events.map(e => {
    if (targetEventId ? e.id === targetEventId : (e.planId === planId && e.type === 'visitor')) {
      return {
        ...e,
        start: targetStartDate.toISOString(),
        end: targetEndDate.toISOString(),
        notes: `${e.notes ? e.notes.replace(/\s*\[Updated:.*?\]/g, '') : ''} [Updated: arrival moved to ${formatDateTime(targetStartDate.toISOString())}]`
      };
    }
    return e;
  });

  const toolCall1: ToolCall = {
    id: `tool-${Date.now()}-1`,
    timestamp: new Date().toISOString(),
    toolName: 'calendar.updateEvent',
    description: `Shifted calendar event "${targetEvent?.title || 'Parents Weekend Visit'}" from ${originalDateFormatted} to ${formatDateTime(targetStartDate.toISOString())}`,
    input: {
      eventId: targetEventId,
      previousStart: targetEvent?.start,
      newStart: targetStartDate.toISOString(),
      newEnd: targetEndDate.toISOString()
    },
    output: {
      status: 'updated',
      calendarSync: 'Committed to simulated household calendar (client simulation)',
      simulatedLatencyMs: 46
    },
    status: 'success',
    executionTimeMs: 46
  };

  // 6. Tool Call: tasks.rescheduleAssociated
  // Shift ONLY tasks belonging to activePlan.id.
  // PRESERVE completion status, category, assignee, notes, estimatedMinutes!
  const morningDeadline = new Date(targetStartDate); morningDeadline.setHours(11, 0, 0, 0);
  const noonDeadline = new Date(targetStartDate); noonDeadline.setHours(13, 0, 0, 0);
  const groceryDeadline = new Date(targetStartDate.getTime() - 3 * 60 * 60 * 1000); // 3h before arrival
  const cleaningDeadline = new Date(targetStartDate.getTime() - 90 * 60 * 1000); // 90 min before
  const smartHomeDeadline = new Date(targetStartDate.getTime() - 60 * 60 * 1000); // 60 min before

  let rescheduledCount = 0;
  const updatedTasks = state.tasks.map(t => {
    if (t.planId === planId) {
      rescheduledCount++;
      let newDue = cleaningDeadline.toISOString();

      if (t.category === 'guest_room') {
        newDue = t.title.toLowerCase().includes('bathroom') ? noonDeadline.toISOString() : morningDeadline.toISOString();
      } else if (t.category === 'groceries') {
        newDue = groceryDeadline.toISOString();
      } else if (t.category === 'cleaning') {
        newDue = cleaningDeadline.toISOString();
      } else if (t.category === 'smart_home') {
        newDue = smartHomeDeadline.toISOString();
      }

      return {
        ...t,
        dueDate: newDue
        // t.completed, t.estimatedMinutes, t.assignee, t.notes are strictly preserved!
      };
    }
    return t;
  });

  const toolCall2: ToolCall = {
    id: `tool-${Date.now()}-2`,
    timestamp: new Date().toISOString(),
    toolName: 'tasks.rescheduleAssociated',
    description: `Rescheduled ${rescheduledCount} associated preparation tasks to ${formatDateShort(targetStartDate.toISOString())} with pre-arrival buffers preserved`,
    input: {
      planId,
      newArrivalTarget: targetStartDate.toISOString(),
      adjustmentPolicy: 'preserve_pre_arrival_buffers'
    },
    output: {
      rescheduledCount,
      freshnessWindowPreserved: true,
      groceryRunShiftedTo: formatDateTime(groceryDeadline.toISOString()),
      simulatedLatencyMs: 58
    },
    status: 'success',
    executionTimeMs: 58
  };

  // 7. Tool Call: routines.updateRoutineTrigger
  // Update ONLY routines belonging to activePlan.id!
  const routineTriggerTime = new Date(targetStartDate.getTime() - 90 * 60 * 1000); // 90 min before arrival
  const routineTriggerDayLabel = params.explicitDate 
    ? formatDateShort(targetStartDate.toISOString()) 
    : targetStartDate.toLocaleDateString('en-US', { weekday: 'long' });
  const triggerString = `${routineTriggerDayLabel} at ${formatTimeOnly(routineTriggerTime.toISOString())} (90 mins before arrival)`;

  const updatedRoutines = state.routines.map(r => {
    if (r.planId === planId) {
      return {
        ...r,
        trigger: triggerString,
        triggerTime: routineTriggerTime.toISOString(),
        status: 'scheduled' as const
      };
    }
    return r;
  });

  const toolCall3: ToolCall = {
    id: `tool-${Date.now()}-3`,
    timestamp: new Date().toISOString(),
    toolName: 'routines.updateRoutineTrigger',
    description: `Updated "Parents Arrival Welcome Routine" trigger to ${triggerString}`,
    input: {
      routineName: 'Parents Arrival Welcome Routine',
      newTriggerTime: routineTriggerTime.toISOString(),
      preConditionBufferMinutes: 90
    },
    output: {
      status: 'rescheduled',
      deviceTarget: 'Thermostat 71°F, Hue Warm Welcome, Guest pass [SIMULATED-CODE-NOT-ISSUED] (no physical lock contacted)',
      simulatedLatencyMs: 34
    },
    status: 'success',
    executionTimeMs: 34
  };

  // 8. Update Plan milestones and targetDate while preserving milestone completion status
  const updatedPlan: Plan = {
    ...activePlan,
    targetDate: targetStartDate.toISOString(),
    updatedAt: new Date().toISOString(),
    milestones: activePlan.milestones.map(m => {
      if (m.title.toLowerCase().includes('clean')) return { ...m, dueDate: morningDeadline.toISOString() };
      if (m.title.toLowerCase().includes('grocer') || m.title.toLowerCase().includes('restock')) return { ...m, dueDate: groceryDeadline.toISOString() };
      if (m.title.toLowerCase().includes('routine') || m.title.toLowerCase().includes('smart')) return { ...m, dueDate: cleaningDeadline.toISOString() };
      if (m.title.toLowerCase().includes('arrival')) return { ...m, dueDate: targetStartDate.toISOString() };
      return m;
    })
  };

  // Calculate synchronized readiness summary
  const readinessResult = computePlanReadiness({
    ...state,
    activePlan: updatedPlan,
    tasks: updatedTasks
  });

  const planSummary: PlanSummary = {
    planTitle: updatedPlan.title,
    readinessScore: readinessResult.readinessPercent,
    completedTasks: readinessResult.completedTasks,
    totalTasks: readinessResult.totalTasks,
    nextMilestone: readinessResult.nextMilestoneTitle || `Deep Clean Guest Suite (${formatDateShort(targetStartDate.toISOString())} 11:00 AM)`,
    targetDateFormatted: formatDateTime(targetStartDate.toISOString())
  };

  const assistantResponseText = `Understood! I've dynamically updated your preparation plan for **${formatDateTime(targetStartDate.toISOString())}**.

Here is what was automatically adjusted:
1. 📅 **Calendar:** Moved **${targetEvent?.title || 'Parents Weekend Visit'}** to **${formatDateTime(targetStartDate.toISOString())}**.
2. 📋 **Tasks & Deadlines:** Shifted **${rescheduledCount} preparation tasks** forward with preparation buffers preserved so your groceries stay fresh and the house stays spotless right before arrival.
3. 🏡 **Alexa+ Smart Home Routine:** Rescheduled the **Parents Arrival Welcome Routine** to trigger at **${formatDateShort(targetStartDate.toISOString())} at ${formatTimeOnly(routineTriggerTime.toISOString())}** (90 minutes before arrival).

All changes have been synchronized across your household state.`;

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
      'View Chores & Tasks'
    ]
  };

  const nextState: HouseholdState = {
    ...state,
    activePlan: updatedPlan,
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
 * Handle natural language task addition
 */
function handleAddTask(state: HouseholdState, params: Record<string, any>): AgentExecutionResult {
  if (params.needsTitle || !params.title) {
    const assistantMessage: ChatMessage = {
      id: `msg-asst-${Date.now()}`,
      sender: 'assistant',
      text: "What task would you like to add? Please specify a title (e.g., *\"Add task: Clean patio furniture\"*) or use the task creation form on the Chores tab.",
      timestamp: new Date().toISOString(),
      suggestedActions: [
        'Add task: Clean the patio furniture',
        'Add task: Vacuum downstairs rug',
        'View Chores & Tasks'
      ]
    };
    return {
      nextState: {
        ...state,
        chatHistory: [...state.chatHistory, assistantMessage]
      },
      responseMessage: assistantMessage,
      executedTools: []
    };
  }

  const activePlanId = state.activePlan?.id;
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(17, 0, 0, 0);

  const newTask: Task = {
    id: `task-custom-${Date.now()}`,
    planId: activePlanId,
    title: params.title,
    category: 'general',
    assignee: params.assignee || 'Shared',
    dueDate: tomorrow.toISOString(),
    priority: params.priority || 'medium',
    completed: false,
    estimatedMinutes: 25,
    notes: 'Created via conversational assistant'
  };

  const toolCall: ToolCall = {
    id: `tool-${Date.now()}-task-create`,
    timestamp: new Date().toISOString(),
    toolName: 'tasks.createTask',
    description: `Created new task: "${newTask.title}" (assigned to ${newTask.assignee})`,
    input: {
      title: newTask.title,
      assignee: newTask.assignee,
      priority: newTask.priority,
      due: newTask.dueDate
    },
    output: {
      taskId: newTask.id,
      status: 'created',
      simulatedLatencyMs: 24
    },
    status: 'success',
    executionTimeMs: 24
  };

  const assistantMessage: ChatMessage = {
    id: `msg-asst-${Date.now()}`,
    sender: 'assistant',
    text: `Created task **"${newTask.title}"** (assigned to **${newTask.assignee}**, priority: ${newTask.priority}).`,
    timestamp: new Date().toISOString(),
    toolCalls: [toolCall],
    suggestedActions: [
      'What still needs doing before they arrive?',
      'View Chores & Tasks'
    ]
  };

  const nextState: HouseholdState = {
    ...state,
    tasks: [newTask, ...state.tasks],
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
 * Handle natural language calendar event creation
 */
function handleCreateCalendarEvent(state: HouseholdState, params: Record<string, any>): AgentExecutionResult {
  if (params.needsDetails || !params.startDate) {
    const assistantMessage: ChatMessage = {
      id: `msg-asst-${Date.now()}`,
      sender: 'assistant',
      text: "To schedule an event, please provide a title and date/time (e.g., *\"Schedule event: Dentist appointment on Nov 15 at 3 PM\"*) or use the validated form on the Calendar tab.",
      timestamp: new Date().toISOString(),
      suggestedActions: [
        'Schedule event: Dentist appointment on Nov 15 at 3 PM',
        'View Calendar'
      ]
    };
    return {
      nextState: {
        ...state,
        chatHistory: [...state.chatHistory, assistantMessage]
      },
      responseMessage: assistantMessage,
      executedTools: []
    };
  }

  const start = new Date(params.startDate);
  const end = new Date(start.getTime() + 60 * 60 * 1000); // 1 hour duration default

  const newEvent: CalendarEvent = {
    id: `evt-custom-${Date.now()}`,
    planId: state.activePlan?.id,
    title: params.title || 'Household Calendar Event',
    start: start.toISOString(),
    end: end.toISOString(),
    type: 'family',
    location: 'Home',
    attendees: ['Vaibhav', 'Sarah'],
    notes: 'Scheduled via conversational assistant'
  };

  const toolCall: ToolCall = {
    id: `tool-${Date.now()}-cal-create`,
    timestamp: new Date().toISOString(),
    toolName: 'calendar.createEvent',
    description: `Scheduled calendar event: "${newEvent.title}" for ${formatDateTime(newEvent.start)}`,
    input: {
      title: newEvent.title,
      start: newEvent.start,
      end: newEvent.end,
      type: newEvent.type
    },
    output: {
      eventId: newEvent.id,
      status: 'created',
      calendarSync: 'Committed to simulated household calendar (client simulation)',
      simulatedLatencyMs: 36
    },
    status: 'success',
    executionTimeMs: 36
  };

  const assistantMessage: ChatMessage = {
    id: `msg-asst-${Date.now()}`,
    sender: 'assistant',
    text: `Scheduled **"${newEvent.title}"** on your household calendar for **${formatDateTime(newEvent.start)}**.`,
    timestamp: new Date().toISOString(),
    toolCalls: [toolCall],
    suggestedActions: [
      'View Calendar',
      'What still needs doing before they arrive?'
    ]
  };

  const nextState: HouseholdState = {
    ...state,
    events: [newEvent, ...state.events],
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
 * SCENARIO 3: "What still needs doing before they arrive?"
 */
function handleScenario3StatusQuery(state: HouseholdState): AgentExecutionResult {
  const activePlan = state.activePlan;
  const readinessResult = computePlanReadiness(state);

  const relevantTasks = activePlan
    ? state.tasks.filter(t => t.planId === activePlan.id)
    : state.tasks;

  const completedTasks = relevantTasks.filter(t => t.completed);
  const pendingTasks = relevantTasks.filter(t => !t.completed);

  const pendingShopping = activePlan
    ? state.shoppingItems.filter(s => s.planId === activePlan.id && !s.completed)
    : state.shoppingItems.filter(s => !s.completed);

  const targetDateStr = activePlan ? activePlan.targetDate : getUpcomingDayOfWeek(6, 17, 0).toISOString();

  const toolCall1: ToolCall = {
    id: `tool-${Date.now()}-1`,
    timestamp: new Date().toISOString(),
    toolName: 'agent.inspectState',
    description: `Inspected state for active plan "${activePlan?.title || 'Household Overview'}": evaluated ${relevantTasks.length} tasks and ${pendingShopping.length} shopping items`,
    input: {
      planId: activePlan?.id || 'all_active_tasks',
      filter: 'pending_before_arrival',
      targetArrivalDate: targetDateStr
    },
    output: {
      totalRelevantTasks: relevantTasks.length,
      completedTaskCount: completedTasks.length,
      pendingTaskCount: pendingTasks.length,
      pendingShoppingCount: pendingShopping.length,
      readinessScorePercent: readinessResult.readinessPercent,
      simulatedLatencyMs: 29
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
      `📊 **Readiness Score:** **${readinessResult.readinessPercent}%** (${completedTasks.length} of ${relevantTasks.length} tasks complete)\n\n` +
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
    readinessScore: readinessResult.readinessPercent,
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
      pendingTasks[0] ? `Mark "${pendingTasks[0].title.slice(0, 28)}..." complete` : 'Check all tasks',
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
    output: { itemId: newItem.id, status: 'added', simulatedLatencyMs: 25 },
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
function handleGenericHelp(state: HouseholdState, _query: string): AgentExecutionResult {
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
 * Direct task toggle mutation that also generates an execution trace
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
    id: `tool-${Date.now()}-task-toggle`,
    timestamp: new Date().toISOString(),
    toolName: 'tasks.toggleComplete',
    description: `Toggled task completion for "${toggledTitle}" -> ${newStatus ? 'COMPLETED' : 'PENDING'}`,
    input: { taskId, targetCompleted: newStatus },
    output: { taskId, completed: newStatus, status: 'updated', simulated: true },
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
 * Direct shopping item toggle mutation with consistent execution trace recording
 */
export function toggleShoppingItemInState(state: HouseholdState, itemId: string): HouseholdState {
  let toggledName = '';
  let newStatus = false;

  const updatedItems = state.shoppingItems.map(item => {
    if (item.id === itemId) {
      newStatus = !item.completed;
      toggledName = item.name;
      return { ...item, completed: newStatus };
    }
    return item;
  });

  const toolCall: ToolCall = {
    id: `tool-${Date.now()}-shop-toggle`,
    timestamp: new Date().toISOString(),
    toolName: 'shopping.toggleComplete',
    description: `Toggled item "${toggledName}" -> ${newStatus ? 'PURCHASED' : 'PENDING'} (Simulated Alexa Shopping List API)`,
    input: { itemId, targetCompleted: newStatus },
    output: { itemId, completed: newStatus, status: 'updated', simulated: true },
    status: 'success',
    executionTimeMs: 15
  };

  return {
    ...state,
    shoppingItems: updatedItems,
    toolHistory: [toolCall, ...state.toolHistory]
  };
}

/**
 * Direct routine toggle mutation with consistent execution trace recording
 */
export function toggleRoutineInState(state: HouseholdState, routineId: string): HouseholdState {
  let toggledName = '';
  let newEnabled = false;

  const updatedRoutines = state.routines.map(r => {
    if (r.id === routineId) {
      newEnabled = !r.enabled;
      toggledName = r.name;
      return { ...r, enabled: newEnabled };
    }
    return r;
  });

  const toolCall: ToolCall = {
    id: `tool-${Date.now()}-routine-toggle`,
    timestamp: new Date().toISOString(),
    toolName: 'routines.toggleRoutine',
    description: `Toggled routine "${toggledName}" -> ${newEnabled ? 'ENABLED' : 'PAUSED'} (Simulated Alexa Smart Home Skills API)`,
    input: { routineId, targetEnabled: newEnabled },
    output: { routineId, enabled: newEnabled, status: 'updated', simulated: true },
    status: 'success',
    executionTimeMs: 20
  };

  return {
    ...state,
    routines: updatedRoutines,
    toolHistory: [toolCall, ...state.toolHistory]
  };
}
