/*
Package bps provides gauges for calculating the Bytes Per Second transfer rate
of data streams.
*/
package bps

import (
	"context"
	"time"
)

// Gauge is the common interface for all BPS gauges in this package. Given a
// set of samples over time, each gauge type can be used to measure the Bytes
// Per Second transfer rate of a data stream.
//
// All samples must monotonically increase in timestamp and value. Each sample
// should represent the total number of bytes sent in a stream, rather than
// accounting for the number sent since the last sample.
//
// To ensure a gauge can report progress as quickly as possible, take an initial
// sample when your stream first starts.
//
// All gauge implementations are safe for concurrent use.
type Gauge interface {
	// Sample adds a new sample of the progress of the monitored stream.
	Sample(t time.Time, n int64)

	// BPS returns the calculated Bytes Per Second rate of the monitored stream.
	BPS() float64
}

// SampleFunc is used by Watch to take periodic samples of a monitored stream.
type SampleFunc func() (n int64)

// Watch will periodically call the given SampleFunc to sample the progress of
// a monitored stream and update the given gauge. SampleFunc should return the
// total number of bytes transferred by the stream since it started.
//
// Watch is a blocking call and should typically be called in a new goroutine.
// To prevent the goroutine from leaking, make sure to cancel the given context
// once the stream is completed or canceled.
func Watch(ctx context.Context, g Gauge, f SampleFunc, interval time.Duration) {
	g.Sample(time.Now(), f())
	t := time.NewTicker(interval)
	defer t.Stop()
	for {
		select {
		case <-ctx.Done():
			return
		case now := <-t.C:
			g.Sample(now, f())
		}
	}
}
