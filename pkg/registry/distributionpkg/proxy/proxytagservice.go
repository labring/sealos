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

package proxy

import (
	"context"

	"github.com/distribution/distribution/v3"
)

// proxyTagService supports local and remote lookup of tags.
type proxyTagService struct {
	localTags      distribution.TagService
	remoteTags     distribution.TagService
	authChallenger authChallenger
}

var _ distribution.TagService = proxyTagService{}

// Get attempts to get the most recent digest for the tag by checking the remote
// tag service first and then caching it locally.  If the remote is unavailable
// the local association is returned
func (pt proxyTagService) Get(ctx context.Context, tag string) (distribution.Descriptor, error) {
	err := pt.authChallenger.tryEstablishChallenges(ctx)
	if err == nil {
		desc, err := pt.remoteTags.Get(ctx, tag)
		if err == nil {
			err := pt.localTags.Tag(ctx, tag, desc)
			if err != nil {
				return distribution.Descriptor{}, err
			}
			return desc, nil
		}
	}

	desc, err := pt.localTags.Get(ctx, tag)
	if err != nil {
		return distribution.Descriptor{}, err
	}
	return desc, nil
}

func (pt proxyTagService) Tag(ctx context.Context, tag string, desc distribution.Descriptor) error {
	return distribution.ErrUnsupported
}

func (pt proxyTagService) Untag(ctx context.Context, tag string) error {
	err := pt.localTags.Untag(ctx, tag)
	if err != nil {
		return err
	}
	return nil
}

func (pt proxyTagService) All(ctx context.Context) ([]string, error) {
	err := pt.authChallenger.tryEstablishChallenges(ctx)
	if err == nil {
		tags, err := pt.remoteTags.All(ctx)
		if err == nil {
			return tags, nil
		}
	}
	return pt.localTags.All(ctx)
}

func (pt proxyTagService) Lookup(ctx context.Context, digest distribution.Descriptor) ([]string, error) {
	return []string{}, distribution.ErrUnsupported
}
