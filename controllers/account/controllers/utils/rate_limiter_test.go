package utils

import (
	"flag"
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
	"k8s.io/client-go/util/workqueue"
	"sigs.k8s.io/controller-runtime/pkg/reconcile"
)

func TestLimiterOptions_BindFlags(t *testing.T) {
	tests := []struct {
		name     string
		opts     *LimiterOptions
		wantOpts *LimiterOptions
	}{
		{
			name: "default values",
			opts: &LimiterOptions{},
			wantOpts: &LimiterOptions{
				MinRetryDelay: defaultMinRetryDelay,
				MaxRetryDelay: defaultMaxRetryDelay,
				QPS:          defaultQPS,
				Burst:        defaultBurst,
			},
		},
		{
			name: "custom values",
			opts: &LimiterOptions{
				MinRetryDelay: 10 * time.Millisecond,
				MaxRetryDelay: 500 * time.Second,
				QPS:          20.0,
				Burst:        200,
			},
			wantOpts: &LimiterOptions{
				MinRetryDelay: 10 * time.Millisecond,
				MaxRetryDelay: 500 * time.Second,
				QPS:          20.0,
				Burst:        200,
			},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			fs := flag.NewFlagSet("test", flag.ContinueOnError)
			tt.opts.BindFlags(fs)

			assert.Equal(t, tt.wantOpts.MinRetryDelay, tt.opts.MinRetryDelay)
			assert.Equal(t, tt.wantOpts.MaxRetryDelay, tt.opts.MaxRetryDelay)
			assert.Equal(t, tt.wantOpts.QPS, tt.opts.QPS)
			assert.Equal(t, tt.wantOpts.Burst, tt.opts.Burst)
		})
	}
}

func TestGetRateLimiter(t *testing.T) {
	tests := []struct {
		name string
		opts *LimiterOptions
	}{
		{
			name: "default options",
			opts: &LimiterOptions{
				MinRetryDelay: defaultMinRetryDelay,
				MaxRetryDelay: defaultMaxRetryDelay,
				QPS:          defaultQPS,
				Burst:        defaultBurst,
			},
		},
		{
			name: "custom options",
			opts: &LimiterOptions{
				MinRetryDelay: 10 * time.Millisecond,
				MaxRetryDelay: 500 * time.Second,
				QPS:          20.0,
				Burst:        200,
			},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			limiter := GetRateLimiter(tt.opts)

			assert.NotNil(t, limiter)
			assert.IsType(t, &workqueue.TypedMaxOfRateLimiter[reconcile.Request]{}, limiter)
		})
	}
}
