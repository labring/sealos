import { TaskType } from 'prisma/global/generated/client';

export type UserTask = {
  id: string;
  title: Record<string, string>;
  description: string;
  reward: string;
  order: number;
  taskType: TaskType;
  isCompleted: boolean;
  completedAt: string;
  isNewUserTask: boolean;
};
