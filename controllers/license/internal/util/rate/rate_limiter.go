package rate

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
	fs.DurationVar(
		&o.MinRetryDelay,
		flagMinRetryDelay,
		defaultMinRetryDelay,
		"The minimum amount of time for which an object being reconciled will have to wait before a retry.",
	)
	fs.DurationVar(
		&o.MaxRetryDelay,
		flagMaxRetryDelay,
		defaultMaxRetryDelay,
		"The maximum amount of time for which an object being reconciled will have to wait before a retry.",
	)
	fs.Float64Var(&o.QPS, flagQPS, defaultQPS, "The maximum number of batches per second to allow.")
	fs.IntVar(
		&o.Burst,
		flagBurst,
		defaultBurst,
		"The maximum number of batches to allow in a short period of time.",
	)
}

func GetRateLimiter(opts *LimiterOptions) workqueue.TypedRateLimiter[reconcile.Request] {
	return workqueue.NewTypedMaxOfRateLimiter[reconcile.Request](
		workqueue.NewTypedItemExponentialFailureRateLimiter[reconcile.Request](
			opts.MinRetryDelay,
			opts.MaxRetryDelay,
		),
		&workqueue.TypedBucketRateLimiter[reconcile.Request]{
			Limiter: rate.NewLimiter(rate.Limit(opts.QPS), opts.Burst),
		},
	)
}
