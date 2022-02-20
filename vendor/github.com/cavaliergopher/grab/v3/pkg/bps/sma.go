package bps

import (
	"sync"
	"time"
)

// NewSMA returns a gauge that uses a Simple Moving Average with the given
// number of samples to measure the bytes per second of a byte stream.
//
// BPS is computed using the timestamp of the most recent and oldest sample in
// the sample buffer. When a new sample is added, the oldest sample is dropped
// if the sample count exceeds maxSamples.
//
// The gauge does not account for any latency in arrival time of new samples or
// the desired window size. Any variance in the arrival of samples will result
// in a BPS measurement that is correct for the submitted samples, but over a
// varying time window.
//
// maxSamples should be equal to 1 + (window size / sampling interval) where
// window size is the number of seconds over which the moving average is
// smoothed and sampling interval is the number of seconds between each sample.
//
// For example, if you want a five second window, sampling once per second,
// maxSamples should be 1 + 5/1 = 6.
func NewSMA(maxSamples int) Gauge {
	if maxSamples < 2 {
		panic("sample count must be greater than 1")
	}
	return &sma{
		maxSamples: uint64(maxSamples),
		samples:    make([]int64, maxSamples),
		timestamps: make([]time.Time, maxSamples),
	}
}

type sma struct {
	mu          sync.Mutex
	index       uint64
	maxSamples  uint64
	sampleCount uint64
	samples     []int64
	timestamps  []time.Time
}

func (c *sma) Sample(t time.Time, n int64) {
	c.mu.Lock()
	defer c.mu.Unlock()

	c.timestamps[c.index] = t
	c.samples[c.index] = n
	c.index = (c.index + 1) % c.maxSamples

	// prevent integer overflow in sampleCount. Values greater or equal to
	// maxSamples have the same semantic meaning.
	c.sampleCount++
	if c.sampleCount > c.maxSamples {
		c.sampleCount = c.maxSamples
	}
}

func (c *sma) BPS() float64 {
	c.mu.Lock()
	defer c.mu.Unlock()

	// we need two samples to start
	if c.sampleCount < 2 {
		return 0
	}

	// First sample is always the oldest until ring buffer first overflows
	oldest := c.index
	if c.sampleCount < c.maxSamples {
		oldest = 0
	}

	newest := (c.index + c.maxSamples - 1) % c.maxSamples
	seconds := c.timestamps[newest].Sub(c.timestamps[oldest]).Seconds()
	bytes := float64(c.samples[newest] - c.samples[oldest])
	return bytes / seconds
}
