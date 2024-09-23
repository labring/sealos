export enum TaskType {
  LAUNCHPAD = 'LAUNCHPAD',
  COSTCENTER = 'COSTCENTER',
  DATABASE = 'DATABASE',
  DESKTOP = 'DESKTOP'
}

export type UserTask = {
  id: string;
  title: string;
  description: string;
  reward: string;
  order: number;
  taskType: TaskType;
  isCompleted: boolean;
  completedAt: string;
};
