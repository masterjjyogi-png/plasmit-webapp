export type TaskPriority = "High" | "Moderate" | "Routine";

export type TaskCategory =
  | "Activity"
  | "Care Plans"
  | "Medication"
  | "Assessments"
  | "Procedure"
  | "POCT"
  | "Feeding"
  | "Patient Requests"
  | "Other";

export type TaskFrequency =
  | "Once a day"
  | "BID"
  | "TID"
  | "QID"
  | "Every hour"
  | "Every 2 hours"
  | "Every 3 hours"
  | "Every 4 hours"
  | "Every 5 hours"
  | "Every 6 hours"
  | "Every 9 hours"
  | "Every 12 hours"
  | "HS - At Bedtime"
  | "SOS - When Required"
  | "STAT - Immediately";

export type TaskStatus = "Active" | "Completed" | "Skipped" | "Discontinued";

export type TaskDisplayStatus = TaskStatus | "Overdue";

export interface WorklistTask {
  id: string;
  taskName: string;
  category: TaskCategory;
  priority: TaskPriority;
  startDate: string;
  startTime: string;
  endDate?: string;
  frequency: TaskFrequency;
  comments?: string;
  status: TaskStatus;
  reason?: string;
  source?: string;
  discontinuedOn?: string;
}

export type WorklistTaskForm = {
  taskName: string;
  category: TaskCategory | "";
  priority: TaskPriority | "";
  startDate: string;
  startTime: string;
  endDate?: string;
  frequency: TaskFrequency | "";
  comments?: string;
};

export type WorklistTaskFormErrors = Partial<Record<keyof WorklistTaskForm, string>>;

export const taskCategories: TaskCategory[] = [
  "Activity",
  "Care Plans",
  "Assessments",
  "POCT",
  "Procedure",
  "Feeding",
  "Medication",
  "Patient Requests",
  "Other",
];

export const taskPriorities: TaskPriority[] = ["High", "Moderate", "Routine"];

export const taskFrequencies: TaskFrequency[] = [
  "Once a day",
  "BID",
  "TID",
  "QID",
  "Every hour",
  "Every 2 hours",
  "Every 3 hours",
  "Every 4 hours",
  "Every 5 hours",
  "Every 6 hours",
  "Every 9 hours",
  "Every 12 hours",
  "HS - At Bedtime",
  "SOS - When Required",
  "STAT - Immediately",
];
