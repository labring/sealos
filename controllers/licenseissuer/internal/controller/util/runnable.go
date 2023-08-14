/*
Copyright 2023.

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
*/

package util

import (
	"context"
	"fmt"
	"time"

	"github.com/go-logr/logr"
	ctrl "sigs.k8s.io/controller-runtime"
	"sigs.k8s.io/controller-runtime/pkg/client"
	"sigs.k8s.io/controller-runtime/pkg/manager"
)

// This file provided a framework which can be used to build a runnable task.
// With this framework, developers can easily build a runnable task and add it to the manager.
func BuildForRunnable(ctx context.Context, client client.Client, options Options) []manager.Runnable {
	pool := NewTaskBuilder(ctx, client, options)
	tasks := pool.tasks
	runnables := make([]manager.Runnable, len(tasks))
	for i := range tasks {
		runnables[i] = tasks[i]
	}
	return runnables
}

// TaskInstance implements the Task interface.
type Task interface {
	Run() error
	Log() *logr.Logger
}

// allow the user to define their own runnable task
type TaskFunc func(context.Context) error

// Once func is used to run a task only once.
func Once(_ context.Context, _ time.Duration, t Task) error {
	err := t.Run()
	if err != nil {
		(t.Log()).Error(err, "failed to run task")
	}
	return err
}

// Periodic func is used to run a task periodically.
func Periodic(ctx context.Context, period time.Duration, t Task) error {
	waitForInit()
	for {
		select {
		case <-ctx.Done():
			return nil
		default:
			err := t.Run()
			if err != nil {
				(t.Log()).Error(err, "failed to run task")
				time.Sleep(time.Minute * 5)
				continue
			}
			time.Sleep(period)
		}
	}
}

// The TaskPool struct is used to build a task.
type TaskPool struct {
	client.Client
	ctx     context.Context
	options Options
	tasks   []*TaskInstance
}

func NewTaskBuilder(ctx context.Context, client client.Client, options Options) *TaskPool {
	return (&TaskPool{
		ctx:     ctx,
		options: options,
		Client:  client,
	}).init()
}

func (tb *TaskPool) init() *TaskPool {
	for o := range tb.options.GetRunnableOptions().Policy {
		tb.tasks = append(tb.tasks, &TaskInstance{
			name:   o,
			logger: ctrl.Log.WithName(string(o)),
			ctx:    tb.ctx,
			policy: tb.options.GetRunnableOptions().Policy[o],
			period: tb.options.GetRunnableOptions().Period[o],
			Client: tb.Client,
		})
	}
	return tb
}

// The TaskInstance struct is used to store the task information.
type TaskInstance struct {
	client.Client
	name   task
	logger logr.Logger
	ctx    context.Context
	policy string
	period time.Duration
}

var _ manager.Runnable = &TaskInstance{}
var _ Task = &TaskInstance{}

func (ti *TaskInstance) Start(ctx context.Context) error {
	switch ti.policy {
	case "Once":
		return Once(ctx, ti.period, ti)
	case "Periodic":
		return Periodic(ctx, ti.period, ti)
	default:
		return fmt.Errorf("the policy is not supported")
	}
}

func (ti *TaskInstance) Run() error {
	switch ti.name {
	case Init:
		_ = initTask{options: GetOptions()}.initWork(ti)
		return nil
	case Notice:
		return (&notice{lastTime: time.Now().Add(-7 * time.Hour).Unix()}).noticeWork(ti)
	case NoticeCleanup:
		return (&noticeCleaner{lastTime: time.Now().Unix()}).cleanWork(ti)
	case Collector:
		return (&collect{options: GetOptions()}).collectWork(ti)
	case DataSync:
		return (&datasycn{}).sync(ti)
	default:
		return fmt.Errorf("the task is not supported")
		// allow developers to add their own runnable task
	}
}

func (ti *TaskInstance) Log() *logr.Logger {
	return &ti.logger
}

func waitForInit() {
	time.Sleep(time.Minute)
}
