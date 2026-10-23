import type { HouseholdState } from '../types/household';
import { getUpcomingDayOfWeek } from '../utils/dateUtils';

export function createInitialSeedState(): HouseholdState {
  const upcomingFriday = getUpcomingDayOfWeek(5, 18, 0); // Friday 6:00 PM
  const upcomingThursday = new Date(upcomingFriday);
  upcomingThursday.setDate(upcomingFriday.getDate() - 1);
  upcomingThursday.setHours(19, 30, 0, 0);

  const upcomingFridayMorning = new Date(upcomingFriday);
  upcomingFridayMorning.setHours(7, 30, 0, 0);

  return {
    activePlan: null,
    archivedPlans: [],
    householdMembers: [
      { id: 'm1', name: 'Vaibhav', role: 'Home Admin', avatarColor: '#3b82f6' },
      { id: 'm2', name: 'Sarah', role: 'Co-Host', avatarColor: '#ec4899' },
      { id: 'm3', name: 'Guest Room (Parents)', role: 'Visiting Family', avatarColor: '#10b981' }
    ],
    events: [
      {
        id: 'evt-seed-1',
        title: 'Weekly Family Dinner',
        start: upcomingThursday.toISOString(),
        end: new Date(upcomingThursday.getTime() + 2 * 60 * 60 * 1000).toISOString(),
        type: 'family',
        location: 'Dining Room',
        attendees: ['Vaibhav', 'Sarah'],
        notes: 'Casual home cooking night'
      },
      {
        id: 'evt-seed-2',
        title: 'Sarah - Morning Yoga',
        start: upcomingFridayMorning.toISOString(),
        end: new Date(upcomingFridayMorning.getTime() + 60 * 60 * 1000).toISOString(),
        type: 'routine',
        location: 'Living Room Studio',
        attendees: ['Sarah'],
        notes: 'Pre-work mindfulness session'
      }
    ],
    tasks: [
      {
        id: 'task-seed-1',
        title: 'Water living room monstera & indoor plants',
        category: 'cleaning',
        assignee: 'Sarah',
        dueDate: upcomingThursday.toISOString(),
        priority: 'low',
        completed: true,
        estimatedMinutes: 10,
        notes: 'Check moisture meter before watering'
      },
      {
        id: 'task-seed-2',
        title: 'Replace HVAC allergen air filter in hallway',
        category: 'general',
        assignee: 'Vaibhav',
        dueDate: upcomingThursday.toISOString(),
        priority: 'medium',
        completed: false,
        estimatedMinutes: 15,
        notes: 'Merv 13 filter in utility closet'
      }
    ],
    shoppingItems: [
      {
        id: 'shop-seed-1',
        name: 'Sparkling mineral water (12-pack)',
        category: 'Beverages',
        quantity: '1 pack',
        completed: true,
        aisle: 'Aisle 4 - Drinks',
        priority: 'essential'
      },
      {
        id: 'shop-seed-2',
        name: 'Organic Hass avocados',
        category: 'Produce',
        quantity: '4 count',
        completed: false,
        aisle: 'Aisle 1 - Fresh Produce',
        priority: 'nice_to_have'
      }
    ],
    routines: [
      {
        id: 'rtn-seed-1',
        name: 'Goodnight Household Shutdown',
        trigger: 'Every night at 11:00 PM',
        enabled: true,
        status: 'scheduled',
        actions: [
          {
            deviceType: 'lock',
            deviceName: 'Front Door Smart Lock',
            actionDescription: 'Ensure deadbolt is securely locked',
            targetState: { locked: true }
          },
          {
            deviceType: 'thermostat',
            deviceName: 'Main Ecobee Thermostat',
            actionDescription: 'Set overnight sleep temperature to 68°F',
            targetState: { temperature: 68, mode: 'cool' }
          },
          {
            deviceType: 'lighting',
            deviceName: 'Downstairs Hue Scene',
            actionDescription: 'Fade off all ground floor lights',
            targetState: { power: false }
          }
        ]
      }
    ],
    toolHistory: [],
    chatHistory: [
      {
        id: 'msg-seed-1',
        sender: 'assistant',
        text: "Hi Vaibhav & Sarah! **HomeHandoff** (Alexa+ Household Agent) is online and synchronized with your home calendar, chore assignments, grocery list, and smart devices.\n\nTry giving me a natural instruction or tap one of the guided scenarios below to see multi-step coordination and autonomous tool execution in action!",
        timestamp: new Date().toISOString(),
        suggestedActions: [
          'My parents are visiting Friday. Prepare the house.',
          "Actually, they're arriving Saturday at 5 PM.",
          'What still needs doing before they arrive?'
        ]
      }
    ],
    settings: {
      voiceFeedback: false,
      ambientSound: true
    }
  };
}
