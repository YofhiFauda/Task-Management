import { Timestamp } from 'firebase/firestore';

export interface Task {
  id: string;
  title: string;
  description: string;
  categoryId?: string;
  statusId: string;
  priority: 'Low' | 'Medium' | 'High' | 'Urgent';
  date?: string; // Due Date
  createdBy: string;
  creatorName: string;
  assigneeId?: string;
  assigneeName?: string;
  monthKey: string;
  customFields?: Record<string, any>;
  createdAt?: Timestamp;
  order: number;
  commentCount?: number;
}

export interface UserProfile {
  uid: string;
  displayName: string;
  email: string;
  photoURL?: string;
}

export interface Category {
  id: string;
  name: string;
  color: string;
  order: number;
}

export interface Status {
  id: string;
  name: string;
  color: string;
  order: number;
}

export interface Notification {
  id: string;
  userId: string;
  taskId: string;
  title: string;
  message: string;
  read: boolean;
  createdAt: Timestamp;
}

export interface ColumnDefinition {
  id: string;
  name: string;
  type: 'text' | 'number' | 'date' | 'boolean';
  order: number;
}

export interface Log {
  id: string;
  userId: string;
  userName: string;
  action: string;
  timestamp: Timestamp;
  changes?: Record<string, { old: any; new: any }>;
}

export interface Comment {
  id: string;
  userId: string;
  userName: string;
  text: string;
  timestamp: Timestamp;
}

export interface CheatSheetItem {
  id: string;
  command: string;
  description: string;
  result: string;
  language?: string;
  userId: string;
  createdAt: Timestamp;
}
