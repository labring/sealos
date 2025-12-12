package informer

import "errors"

// ErrCacheSyncFailed is returned when informer cache sync fails
var ErrCacheSyncFailed = errors.New("failed to sync informer caches")
