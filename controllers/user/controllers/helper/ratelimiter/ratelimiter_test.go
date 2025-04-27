package ratelimiter

import (
	"flag"
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
	"k8s.io/client-go/util/workqueue"
	"sigs.k8s.io/controller-runtime/pkg/reconcile"
)

func TestRateLimiterOptions_BindFlags(t *testing.T) {
	tests := []struct {
		name     string
		opts     RateLimiterOptions
		wantOpts RateLimiterOptions
	}{
		{
			name: "default values",
			opts: RateLimiterOptions{},
			wantOpts: RateLimiterOptions{
				minRetryDelay: defaultMinRetryDelay,
				maxRetryDelay: defaultMaxRetryDelay,
				qps:          defaultQPS,
				burst:        defaultBurst,
				concurrent:   defaultConcurrent,
			},
		},
		{
			name: "custom values",
			opts: RateLimiterOptions{
				minRetryDelay: 10 * time.Millisecond,
				maxRetryDelay: 500 * time.Second,
				qps:          20.0,
				burst:        200,
				concurrent:   10,
			},
			wantOpts: RateLimiterOptions{
				minRetryDelay: 10 * time.Millisecond,
				maxRetryDelay: 500 * time.Second,
				qps:          20.0,
				burst:        200,
				concurrent:   10,
			},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			fs := flag.NewFlagSet("test", flag.ContinueOnError)
			tt.opts.BindFlags(fs)

			err := fs.Parse([]string{
				"--" + flagMinRetryDelay, tt.wantOpts.minRetryDelay.String(),
				"--" + flagMaxRetryDelay, tt.wantOpts.maxRetryDelay.String(),
				"--" + flagQPS, "10",
				"--" + flagBurst, "100",
				"--" + flagConcurrent, "5",
			})

			assert.NoError(t, err)
			assert.Equal(t, tt.wantOpts.minRetryDelay, tt.opts.minRetryDelay)
			assert.Equal(t, tt.wantOpts.maxRetryDelay, tt.opts.maxRetryDelay)
			assert.Equal(t, tt.wantOpts.qps, tt.opts.qps)
			assert.Equal(t, tt.wantOpts.burst, tt.opts.burst)
			assert.Equal(t, tt.wantOpts.concurrent, tt.opts.concurrent)
		})
	}
}

func TestGetRateLimiter(t *testing.T) {
	opts := RateLimiterOptions{
		minRetryDelay: 5 * time.Millisecond,
		maxRetryDelay: 1000 * time.Second,
		qps:          10.0,
		burst:        100,
	}

	limiter := GetRateLimiter(opts)
	assert.NotNil(t, limiter)
	assert.IsType(t, &workqueue.TypedMaxOfRateLimiter[reconcile.Request]{}, limiter)
}

func TestGetConcurrent(t *testing.T) {
	tests := []struct {
		name     string
		opts     RateLimiterOptions
		expected int
	}{
		{
			name: "default concurrent",
			opts: RateLimiterOptions{
				concurrent: defaultConcurrent,
			},
			expected: defaultConcurrent,
		},
		{
			name: "custom concurrent",
			opts: RateLimiterOptions{
				concurrent: 10,
			},
			expected: 10,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := GetConcurrent(tt.opts)
			assert.Equal(t, tt.expected, result)
		})
	}
}
