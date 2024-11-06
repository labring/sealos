package helper

import (
	"context"
	"sync"

	"github.com/sirupsen/logrus"
)

type Task interface {
	Execute() error
}

type TaskQueue struct {
	ctx     context.Context
	cancel  context.CancelFunc
	queue   chan Task
	workers int
	wg      sync.WaitGroup
	//mu      sync.Mutex
	started bool
}

func NewTaskQueue(ctx context.Context, workerCount, queueSize int) *TaskQueue {
	ctx, cancel := context.WithCancel(ctx)
	return &TaskQueue{
		ctx:     ctx,
		queue:   make(chan Task, queueSize),
		workers: workerCount,
		cancel:  cancel,
	}
}

func (tq *TaskQueue) AddTask(task Task) {
	//tq.mu.Lock()
	//defer tq.mu.Unlock()
	//if tq.started {
	//	tq.queue <- task
	//} else {
	//	fmt.Println("TaskQueue has not been started yet")
	//}
	select {
	case <-tq.ctx.Done():
		logrus.Info("TaskQueue has been stopped.")
	case tq.queue <- task:
	}
}

func (tq *TaskQueue) Start() {
	if tq.started {
		return
	}
	tq.started = true
	for i := 0; i < tq.workers; i++ {
		tq.wg.Add(1)
		go tq.worker(i)
	}
}

func (tq *TaskQueue) Stop() {
	tq.cancel()
	tq.wg.Wait()
	close(tq.queue)
	logrus.Info("TaskQueue stopped")
}

func (tq *TaskQueue) worker(id int) {
	defer tq.wg.Done()
	for {
		select {
		case <-tq.ctx.Done():
			return
		case task, ok := <-tq.queue:
			if !ok {
				return
			}
			if err := task.Execute(); err != nil {
				// TODO handle task execution failures
				logrus.Errorf("Worker %d failed to process task: %v", id, err)
			}
		}
	}
}
