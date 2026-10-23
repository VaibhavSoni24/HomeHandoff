export type PlanCategory = 'guest_prep' | 'party' | 'holiday' | 'maintenance' | 'general';
export type TaskCategory = 'guest_room' | 'cleaning' | 'groceries' | 'logistics' | 'smart_home' | 'general';
export type TaskPriority = 'high' | 'medium' | 'low';
export type EventType = 'visitor' | 'family' | 'errand' | 'preparation' | 'routine';
export type ShoppingCategory = 'Produce' | 'Bakery' | 'Dairy & Refrigerated' | 'Beverages' | 'Guest Amenities' | 'Pantry';

export interface Milestone {
  id: string;
  title: string;
  dueDate: string;
  completed: boolean;
}

export interface Plan {
  id: string;
  title: string;
  description: string;
  status: 'active' | 'completed' | 'archived';
  targetEventId?: string;
  targetDate: string; // ISO string
  createdAt: string;
  updatedAt: string;
  category: PlanCategory;
  milestones: Milestone[];
}

export interface Task {
  id: string;
  planId?: string;
  title: string;
  category: TaskCategory;
  assignee: string;
  dueDate?: string; // ISO string, or omitted if no deadline
  priority: TaskPriority;
  completed: boolean;
  estimatedMinutes: number;
  notes?: string;
}

export interface CalendarEvent {
  id: string;
  planId?: string;
  title: string;
  start: string; // ISO string
  end: string;   // ISO string
  type: EventType;
  location?: string;
  attendees?: string[];
  notes?: string;
}

export interface ShoppingItem {
  id: string;
  planId?: string;
  name: string;
  category: ShoppingCategory;
  quantity: string;
  completed: boolean;
  aisle?: string;
  priority?: 'essential' | 'nice_to_have';
}

export interface SmartRoutineAction {
  deviceType: 'thermostat' | 'lighting' | 'lock' | 'air_purifier' | 'vacuum';
  deviceName: string;
  actionDescription: string;
  targetState: Record<string, string | number | boolean>;
}

export interface SmartRoutine {
  id: string;
  planId?: string;
  name: string;
  trigger: string;
  triggerTime?: string; // ISO string
  enabled: boolean;
  actions: SmartRoutineAction[];
  status: 'idle' | 'scheduled' | 'executed';
}

export type ToolName = 
  | 'calendar.createEvent'
  | 'calendar.updateEvent'
  | 'tasks.batchCreate'
  | 'tasks.createTask'
  | 'tasks.rescheduleAssociated'
  | 'tasks.toggleComplete'
  | 'shopping.addItems'
  | 'shopping.toggleComplete'
  | 'routines.scheduleSmartHomeRoutine'
  | 'routines.updateRoutineTrigger'
  | 'routines.toggleRoutine'
  | 'agent.inspectState';

export interface ToolCall {
  id: string;
  timestamp: string;
  toolName: ToolName;
  description: string;
  input: Record<string, any>;
  output: Record<string, any>;
  status: 'success' | 'failed' | 'executing';
  executionTimeMs: number;
}

export interface PlanSummary {
  planTitle: string;
  readinessScore: number;
  completedTasks: number;
  totalTasks: number;
  nextMilestone: string;
  targetDateFormatted: string;
}

export interface ChatMessage {
  id: string;
  sender: 'user' | 'assistant' | 'system';
  text: string;
  timestamp: string;
  toolCalls?: ToolCall[];
  suggestedActions?: string[];
  planSummary?: PlanSummary;
}

export interface HouseholdMember {
  id: string;
  name: string;
  role: string;
  avatarColor: string;
}

export interface HouseholdState {
  activePlan: Plan | null;
  archivedPlans: Plan[];
  events: CalendarEvent[];
  tasks: Task[];
  shoppingItems: ShoppingItem[];
  routines: SmartRoutine[];
  toolHistory: ToolCall[];
  chatHistory: ChatMessage[];
  householdMembers: HouseholdMember[];
  settings: {
    voiceFeedback: boolean;
    ambientSound: boolean;
  };
}
