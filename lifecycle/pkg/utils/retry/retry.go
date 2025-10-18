// Copyright © 2021 sealos.
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

package retry

import (
	"fmt"
	"time"
)

func Retry(tryTimes int, trySleepTime time.Duration, action func() error) error {
	var err error
	for i := range tryTimes {
		err = action()
		if err == nil {
			return nil
		}

		time.Sleep(trySleepTime * time.Duration(2*i+1))
	}
	return fmt.Errorf("retry action timeout: %w", err)
}

// RetryWithBackoff provides exponential backoff retry with jitter
func RetryWithBackoff(maxAttempts int, baseDelay time.Duration, action func() error) error {
	var lastErr error
	for attempt := 0; attempt < maxAttempts; attempt++ {
		if err := action(); err == nil {
			return nil
		} else {
			lastErr = err
		}

		if attempt < maxAttempts-1 {
			// Exponential backoff with jitter
			delay := baseDelay * time.Duration(1<<uint(attempt))
			if delay > 5*time.Second {
				delay = 5 * time.Second // cap the delay
			}
			// Add some jitter to avoid thundering herd
			jitter := time.Duration(float64(delay) * 0.1 * (0.5 + 0.5*float64(attempt%2)))
			time.Sleep(delay + jitter)
		}
	}
	return fmt.Errorf("retry action failed after %d attempts: %w", maxAttempts, lastErr)
}

// RetryConditionally retries only when the condition returns true
func RetryConditionally(maxAttempts int, baseDelay time.Duration, condition func(error) bool, action func() error) error {
	var lastErr error
	for attempt := 0; attempt < maxAttempts; attempt++ {
		if err := action(); err == nil {
			return nil
		} else {
			lastErr = err
			if !condition(err) {
				// Don't retry if condition is not met
				break
			}
		}

		if attempt < maxAttempts-1 {
			delay := baseDelay * time.Duration(2*attempt+1)
			time.Sleep(delay)
		}
	}
	return fmt.Errorf("retry action failed after %d attempts: %w", maxAttempts, lastErr)
}
