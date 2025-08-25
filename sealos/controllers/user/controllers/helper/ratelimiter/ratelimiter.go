// Copyright © 2023 sealos.
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

package ratelimiter

import (
	"flag"
	"time"

	"golang.org/x/time/rate"

	"k8s.io/client-go/util/workqueue"
	"sigs.k8s.io/controller-runtime/pkg/reconcile"
)

const (
	defaultMinRetryDelay = 5 * time.Millisecond
	defaultMaxRetryDelay = 1000 * time.Second
	defaultQPS           = float64(10.0)
	defaultBurst         = 100
	defaultConcurrent    = 5
	flagMinRetryDelay    = "min-retry-delay"
	flagMaxRetryDelay    = "max-retry-delay"
	flagQPS              = "default-qps"
	flagBurst            = "default-burst"
	flagConcurrent       = "default-concurrent"
)

// RateLimiterOptions used on reconcilers.
type RateLimiterOptions struct {
	minRetryDelay time.Duration
	maxRetryDelay time.Duration
	qps           float64
	burst         int
	concurrent    int
}

func (o *RateLimiterOptions) BindFlags(fs *flag.FlagSet) {
	fs.DurationVar(&o.minRetryDelay, flagMinRetryDelay, defaultMinRetryDelay,
		"Specifies the minimum delay time before retrying the reconciliation of an object. This delay provides a buffer to prevent rapid-fire retries.")
	fs.DurationVar(&o.maxRetryDelay, flagMaxRetryDelay, defaultMaxRetryDelay,
		"Specifies the maximum delay time before retrying the reconciliation of an object. This cap ensures that retry delays don't grow excessively long.")
	fs.Float64Var(&o.qps, flagQPS, defaultQPS, "Sets the maximum allowed quantity of process units (batches) that can be processed per second. This limit helps maintain a controlled processing rate.")
	fs.IntVar(&o.burst, flagBurst, defaultBurst, "Sets the maximum quantity of process units (batches) that can be processed in a burst. This limit helps control the processing rate during short periods of high activity.")
	flag.IntVar(&o.concurrent, flagConcurrent, defaultConcurrent, "The number of concurrent reconciles.")
}

func GetRateLimiter(opts RateLimiterOptions) workqueue.TypedRateLimiter[reconcile.Request] {
	return workqueue.NewTypedMaxOfRateLimiter[reconcile.Request](
		workqueue.NewTypedItemExponentialFailureRateLimiter[reconcile.Request](opts.minRetryDelay, opts.maxRetryDelay),
		&workqueue.TypedBucketRateLimiter[reconcile.Request]{Limiter: rate.NewLimiter(rate.Limit(opts.qps), opts.burst)},
	)
}

func GetConcurrent(opts RateLimiterOptions) int {
	return opts.concurrent
}
