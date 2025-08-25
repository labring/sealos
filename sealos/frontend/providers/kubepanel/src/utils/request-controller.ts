import { range } from 'lodash';

export type RequestControllerProps = {
  timeoutDuration: number;
  limit?: number;
};

// TODO: task tag
type Task = () => Promise<any>;

export class RequestController {
  private readonly timeoutDuration: number; // ms
  private readonly limit: number;
  private tasks: Array<Task> = [];
  private index: number = 0;
  private results: Array<any> = [];

  constructor(props: RequestControllerProps) {
    this.timeoutDuration = props.timeoutDuration;
    this.limit = props.limit ?? 3;
  }

  private static timeout(ms: number) {
    return new Promise((reject) =>
      setTimeout(() => {
        reject(new Error('Timeout Error'));
      }, ms)
    );
  }

  private async executeTask(index: number): Promise<any> {
    const task = this.tasks[index];

    if (!task) return;
    this.index++;
    try {
      const res = await Promise.race([task(), RequestController.timeout(this.timeoutDuration)]);
      this.results[this.index] = res ?? null;
    } catch (err: any) {
      this.results[this.index] = err;
    }
    return this.executeTask(this.index);
  }

  private stop() {
    this.index = this.tasks.length;
  }

  async runTasks(tasks: Array<Task>) {
    this.stop();
    this.index = 0;
    this.tasks = tasks;
    this.results = [];

    await Promise.allSettled(range(this.limit).map((index) => this.executeTask(index)));

    return this.results;
  }
}
