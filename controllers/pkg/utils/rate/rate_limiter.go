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

package rate

import (
	"flag"
	"time"

	"golang.org/x/time/rate"

	"k8s.io/client-go/util/workqueue"
	"sigs.k8s.io/controller-runtime/pkg/ratelimiter"
)

const (
	defaultMinRetryDelay = 5 * time.Millisecond
	defaultMaxRetryDelay = 1000 * time.Second
	defaultQPS           = float64(10.0)
	defaultBurst         = 100
	flagMinRetryDelay    = "min-retry-delay"
	flagMaxRetryDelay    = "max-retry-delay"
	flagQPS              = "default-qps"
	flagBurst            = "default-burst"
)

// LimiterOptions used on reconcilers.
type LimiterOptions struct {
	MinRetryDelay time.Duration
	QPS           float64
	Burst         int
	MaxRetryDelay time.Duration
}

func (o *LimiterOptions) BindFlags(fs *flag.FlagSet) {
	fs.DurationVar(&o.MinRetryDelay, flagMinRetryDelay, defaultMinRetryDelay,
		"The minimum amount of time for which an object being reconciled will have to wait before a retry.")
	fs.DurationVar(&o.MaxRetryDelay, flagMaxRetryDelay, defaultMaxRetryDelay,
		"The maximum amount of time for which an object being reconciled will have to wait before a retry.")
	fs.Float64Var(&o.QPS, flagQPS, defaultQPS, "The maximum number of batches per second to allow.")
	fs.IntVar(&o.Burst, flagBurst, defaultBurst, "The maximum number of batches to allow in a short period of time.")
}

func GetRateLimiter(opts LimiterOptions) ratelimiter.RateLimiter {
	return workqueue.NewMaxOfRateLimiter(
		workqueue.NewItemExponentialFailureRateLimiter(opts.MinRetryDelay, opts.MaxRetryDelay),
		// 10 qps, 100 bucket size.  This is only for retry speed and its only the overall factor (not per item)
		&workqueue.BucketRateLimiter{Limiter: rate.NewLimiter(rate.Limit(opts.QPS), opts.Burst)},
	)
}
