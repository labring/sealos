package cache

import (
	"context"

	"github.com/distribution/distribution/v3"
	dcontext "github.com/distribution/distribution/v3/context"
	prometheus "github.com/distribution/distribution/v3/metrics"
	"github.com/opencontainers/go-digest"
)

type cachedBlobStatter struct {
	cache   distribution.BlobDescriptorService
	backend distribution.BlobDescriptorService
}

var (
	// cacheCount is the number of total cache request received/hits/misses
	cacheCount = prometheus.StorageNamespace.NewLabeledCounter("cache", "The number of cache request received", "type")
)

// NewCachedBlobStatter creates a new statter which prefers a cache and
// falls back to a backend.
func NewCachedBlobStatter(cache distribution.BlobDescriptorService, backend distribution.BlobDescriptorService) distribution.BlobDescriptorService {
	return &cachedBlobStatter{
		cache:   cache,
		backend: backend,
	}
}

func (cbds *cachedBlobStatter) Stat(ctx context.Context, dgst digest.Digest) (distribution.Descriptor, error) {
	cacheCount.WithValues("Request").Inc(1)

	// try getting from cache
	desc, cacheErr := cbds.cache.Stat(ctx, dgst)
	if cacheErr == nil {
		cacheCount.WithValues("Hit").Inc(1)
		return desc, nil
	}

	// couldn't get from cache; get from backend
	desc, err := cbds.backend.Stat(ctx, dgst)
	if err != nil {
		return desc, err
	}

	if cacheErr == distribution.ErrBlobUnknown {
		// cache doesn't have info. update it with info got from backend
		cacheCount.WithValues("Miss").Inc(1)
		if err := cbds.cache.SetDescriptor(ctx, dgst, desc); err != nil {
			dcontext.GetLoggerWithField(ctx, "blob", dgst).WithError(err).Error("error from cache setting desc")
		}
		// we don't need to return cache error upstream if any. continue returning value from backend
	} else {
		// unknown error from cache. just log and error. do not store cache as it may be trigger many set calls
		dcontext.GetLoggerWithField(ctx, "blob", dgst).WithError(cacheErr).Error("error from cache stat(ing) blob")
		cacheCount.WithValues("Error").Inc(1)
	}

	return desc, nil
}

func (cbds *cachedBlobStatter) Clear(ctx context.Context, dgst digest.Digest) error {
	err := cbds.cache.Clear(ctx, dgst)
	if err != nil {
		return err
	}

	err = cbds.backend.Clear(ctx, dgst)
	if err != nil {
		return err
	}
	return nil
}

func (cbds *cachedBlobStatter) SetDescriptor(ctx context.Context, dgst digest.Digest, desc distribution.Descriptor) error {
	if err := cbds.cache.SetDescriptor(ctx, dgst, desc); err != nil {
		dcontext.GetLoggerWithField(ctx, "blob", dgst).WithError(err).Error("error from cache setting desc")
	}
	return nil
}
