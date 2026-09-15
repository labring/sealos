// Copyright 2026 labring.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

package controllers

import (
	"context"
	"errors"
	"testing"
	"time"

	"github.com/go-logr/logr"
	accountv1 "github.com/labring/sealos/controllers/account/api/v1"
	corev1 "k8s.io/api/core/v1"
	"k8s.io/apimachinery/pkg/watch"
	"sigs.k8s.io/controller-runtime/pkg/client"
)

type paymentLifecycleClient struct {
	client.WithWatch
	watchFunc func(context.Context) (watch.Interface, error)
	listFunc  func(context.Context) error
}

func (c *paymentLifecycleClient) Watch(
	ctx context.Context,
	_ client.ObjectList,
	_ ...client.ListOption,
) (watch.Interface, error) {
	return c.watchFunc(ctx)
}

func (c *paymentLifecycleClient) List(
	ctx context.Context,
	_ client.ObjectList,
	_ ...client.ListOption,
) error {
	return c.listFunc(ctx)
}

func TestPaymentWatchClosesOnEveryReturn(t *testing.T) {
	for _, tt := range []struct {
		name    string
		event   *watch.Event
		closed  bool
		cancel  bool
		wantErr bool
	}{
		{
			name: "initialized payment",
			event: &watch.Event{Type: watch.Modified, Object: &accountv1.Payment{
				Status: accountv1.PaymentStatus{TradeNO: "existing-trade"},
			}},
		},
		{name: "invalid object", event: &watch.Event{Type: watch.Added, Object: &corev1.Pod{}}, wantErr: true},
		{name: "processing failure", event: &watch.Event{Type: watch.Added, Object: &accountv1.Payment{}}, wantErr: true},
		{name: "nil object", event: &watch.Event{Type: watch.Error}},
		{name: "closed stream", closed: true},
		{name: "canceled context", cancel: true},
	} {
		t.Run(tt.name, func(t *testing.T) {
			ctx, cancel := context.WithCancel(context.Background())
			defer cancel()
			stream := watch.NewRaceFreeFake()
			if tt.event != nil {
				stream.Action(tt.event.Type, tt.event.Object)
			}
			if tt.closed {
				stream.Stop()
			}
			if tt.cancel {
				cancel()
			}
			cl := &paymentLifecycleClient{
				watchFunc: func(got context.Context) (watch.Interface, error) {
					if got != ctx {
						t.Error("watch did not receive the caller context")
					}
					return stream, nil
				},
			}
			r := &PaymentReconciler{WatchClient: cl}
			errs := r.reconcileCreatePayments(ctx)
			if (len(errs) != 0) != tt.wantErr {
				t.Fatalf("errors = %v, want error = %t", errs, tt.wantErr)
			}
			if !stream.IsStopped() {
				t.Error("payment watch remains open after reconcile returns")
			}
		})
	}
}

func TestPaymentWatchCreationError(t *testing.T) {
	wantErr := errors.New("watch unavailable")
	r := &PaymentReconciler{WatchClient: &paymentLifecycleClient{
		watchFunc: func(context.Context) (watch.Interface, error) { return nil, wantErr },
	}}
	errs := r.reconcileCreatePayments(context.Background())
	if len(errs) != 1 || !errors.Is(errs[0], wantErr) {
		t.Fatalf("errors = %v, want wrapped watch error", errs)
	}
}

func TestPaymentStartWaitsForWorkersAndCancelsAPIRequests(t *testing.T) {
	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()
	listStarted := make(chan struct{})
	watchStarted := make(chan struct{})
	listDone := make(chan struct{})
	stream := watch.NewRaceFreeFake()
	cl := &paymentLifecycleClient{
		listFunc: func(got context.Context) error {
			select {
			case <-listStarted:
			default:
				close(listStarted)
			}
			// Bound the wait even when testing a broken context propagation.
			select {
			case <-got.Done():
			case <-time.After(3 * time.Second):
			}
			if got != ctx {
				t.Error("list did not receive the manager context")
			}
			select {
			case <-listDone:
			default:
				close(listDone)
			}
			return got.Err()
		},
		watchFunc: func(got context.Context) (watch.Interface, error) {
			if got != ctx {
				t.Error("watch did not receive the manager context")
			}
			select {
			case <-watchStarted:
			default:
				close(watchStarted)
			}
			return stream, nil
		},
	}
	r := &PaymentReconciler{
		Client: cl, WatchClient: cl, Logger: logr.Discard(),
		reconcileDuration: time.Millisecond, createDuration: time.Millisecond,
	}
	returned := make(chan error, 1)
	go func() { returned <- r.Start(ctx) }()
	for _, started := range []chan struct{}{listStarted, watchStarted} {
		select {
		case <-started:
		case err := <-returned:
			cancel()
			t.Fatalf("Start returned before cancellation: %v", err)
		case <-time.After(5 * time.Second):
			cancel()
			t.Fatal("payment worker did not start")
		}
	}
	select {
	case err := <-returned:
		t.Fatalf("Start returned while payment workers were running: %v", err)
	default:
	}
	cancel()
	select {
	case err := <-returned:
		if err != nil {
			t.Fatalf("Start returned error: %v", err)
		}
	case <-time.After(5 * time.Second):
		t.Fatal("Start did not return after cancellation")
	}
	select {
	case <-listDone:
	default:
		t.Error("Start returned before list worker exited")
	}
	if !stream.IsStopped() {
		t.Error("Start left the payment watch open")
	}
}
