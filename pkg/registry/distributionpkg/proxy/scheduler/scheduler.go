// Copyright © 2021 https://github.com/distribution/distribution
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

package scheduler

import (
	"context"
	"encoding/json"
	"fmt"
	"sync"
	"time"

	dcontext "github.com/distribution/distribution/v3/context"
	"github.com/distribution/distribution/v3/reference"
	"github.com/distribution/distribution/v3/registry/storage/driver"
)

// onTTLExpiryFunc is called when a repository's TTL expires
type expiryFunc func(reference.Reference) error

const (
	entryTypeBlob = iota
	entryTypeManifest
	indexSaveFrequency = 5 * time.Second
)

// schedulerEntry represents an entry in the scheduler
// fields are exported for serialization
type schedulerEntry struct {
	Key       string    `json:"Key"`
	Expiry    time.Time `json:"ExpiryData"`
	EntryType int       `json:"EntryType"`

	timer *time.Timer
}

// New returns a new instance of the scheduler
func New(ctx context.Context, driver driver.StorageDriver, path string) *TTLExpirationScheduler {
	return &TTLExpirationScheduler{
		entries:         make(map[string]*schedulerEntry),
		driver:          driver,
		pathToStateFile: path,
		ctx:             ctx,
		stopped:         true,
		doneChan:        make(chan struct{}),
		saveTimer:       time.NewTicker(indexSaveFrequency),
	}
}

// TTLExpirationScheduler is a scheduler used to perform actions
// when TTLs expire
type TTLExpirationScheduler struct {
	sync.Mutex

	entries map[string]*schedulerEntry

	driver          driver.StorageDriver
	ctx             context.Context
	pathToStateFile string

	stopped bool

	onBlobExpire     expiryFunc
	onManifestExpire expiryFunc

	indexDirty bool
	saveTimer  *time.Ticker
	doneChan   chan struct{}
}

// OnBlobExpire is called when a scheduled blob's TTL expires
func (ttles *TTLExpirationScheduler) OnBlobExpire(f expiryFunc) {
	ttles.Lock()
	defer ttles.Unlock()

	ttles.onBlobExpire = f
}

// OnManifestExpire is called when a scheduled manifest's TTL expires
func (ttles *TTLExpirationScheduler) OnManifestExpire(f expiryFunc) {
	ttles.Lock()
	defer ttles.Unlock()

	ttles.onManifestExpire = f
}

// AddBlob schedules a blob cleanup after ttl expires
func (ttles *TTLExpirationScheduler) AddBlob(blobRef reference.Canonical, ttl time.Duration) error {
	ttles.Lock()
	defer ttles.Unlock()

	if ttles.stopped {
		return fmt.Errorf("scheduler not started")
	}

	ttles.add(blobRef, ttl, entryTypeBlob)
	return nil
}

// AddManifest schedules a manifest cleanup after ttl expires
func (ttles *TTLExpirationScheduler) AddManifest(manifestRef reference.Canonical, ttl time.Duration) error {
	ttles.Lock()
	defer ttles.Unlock()

	if ttles.stopped {
		return fmt.Errorf("scheduler not started")
	}

	ttles.add(manifestRef, ttl, entryTypeManifest)
	return nil
}

// Start starts the scheduler
func (ttles *TTLExpirationScheduler) Start() error {
	ttles.Lock()
	defer ttles.Unlock()

	if err := ttles.readState(); err != nil {
		return err
	}

	if !ttles.stopped {
		return fmt.Errorf("scheduler already started")
	}

	//	dcontext.GetLogger(ttles.ctx).Infof("Starting cached object TTL expiration scheduler...")
	ttles.stopped = false

	// Start timer for each deserialized entry
	for _, entry := range ttles.entries {
		entry.timer = ttles.startTimer(entry, time.Until(entry.Expiry))
	}

	// Start a ticker to periodically save the entries index

	go func() {
		for {
			select {
			case <-ttles.saveTimer.C:
				ttles.Lock()
				if !ttles.indexDirty {
					ttles.Unlock()
					continue
				}

				err := ttles.writeState()
				if err != nil {
					dcontext.GetLogger(ttles.ctx).Errorf("Error writing scheduler state: %s", err)
				} else {
					ttles.indexDirty = false
				}
				ttles.Unlock()

			case <-ttles.doneChan:
				return
			}
		}
	}()

	return nil
}

func (ttles *TTLExpirationScheduler) add(r reference.Reference, ttl time.Duration, eType int) {
	entry := &schedulerEntry{
		Key:       r.String(),
		Expiry:    time.Now().Add(ttl),
		EntryType: eType,
	}
	//	dcontext.GetLogger(ttles.ctx).Infof("Adding new scheduler entry for %s with ttl=%s", entry.Key, time.Until(entry.Expiry))
	if oldEntry, present := ttles.entries[entry.Key]; present && oldEntry.timer != nil {
		oldEntry.timer.Stop()
	}
	ttles.entries[entry.Key] = entry
	entry.timer = ttles.startTimer(entry, ttl)
	ttles.indexDirty = true
}

func (ttles *TTLExpirationScheduler) startTimer(entry *schedulerEntry, ttl time.Duration) *time.Timer {
	return time.AfterFunc(ttl, func() {
		ttles.Lock()
		defer ttles.Unlock()

		var f expiryFunc

		switch entry.EntryType {
		case entryTypeBlob:
			f = ttles.onBlobExpire
		case entryTypeManifest:
			f = ttles.onManifestExpire
		default:
			f = func(reference.Reference) error {
				return fmt.Errorf("scheduler entry type")
			}
		}

		ref, err := reference.Parse(entry.Key)
		if err == nil {
			if err := f(ref); err != nil {
				dcontext.GetLogger(ttles.ctx).Errorf("Scheduler error returned from OnExpire(%s): %s", entry.Key, err)
			}
		} else {
			dcontext.GetLogger(ttles.ctx).Errorf("Error unpacking reference: %s", err)
		}

		delete(ttles.entries, entry.Key)
		ttles.indexDirty = true
	})
}

// Stop stops the scheduler.
func (ttles *TTLExpirationScheduler) Stop() {
	ttles.Lock()
	defer ttles.Unlock()

	if err := ttles.writeState(); err != nil {
		dcontext.GetLogger(ttles.ctx).Errorf("Error writing scheduler state: %s", err)
	}

	for _, entry := range ttles.entries {
		entry.timer.Stop()
	}

	close(ttles.doneChan)
	ttles.saveTimer.Stop()
	ttles.stopped = true
}

func (ttles *TTLExpirationScheduler) writeState() error {
	jsonBytes, err := json.Marshal(ttles.entries)
	if err != nil {
		return err
	}

	err = ttles.driver.PutContent(ttles.ctx, ttles.pathToStateFile, jsonBytes)
	if err != nil {
		return err
	}

	return nil
}

func (ttles *TTLExpirationScheduler) readState() error {
	if _, err := ttles.driver.Stat(ttles.ctx, ttles.pathToStateFile); err != nil {
		switch err := err.(type) {
		case driver.PathNotFoundError:
			return nil
		default:
			return err
		}
	}

	bytes, err := ttles.driver.GetContent(ttles.ctx, ttles.pathToStateFile)
	if err != nil {
		return err
	}

	err = json.Unmarshal(bytes, &ttles.entries)
	if err != nil {
		return err
	}
	return nil
}
