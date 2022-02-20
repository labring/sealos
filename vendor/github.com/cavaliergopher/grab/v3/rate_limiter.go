package grab

import "context"

// RateLimiter is an interface that must be satisfied by any third-party rate
// limiters that may be used to limit download transfer speeds.
//
// A recommended token bucket implementation can be found at
// https://godoc.org/golang.org/x/time/rate#Limiter.
type RateLimiter interface {
	WaitN(ctx context.Context, n int) (err error)
}
