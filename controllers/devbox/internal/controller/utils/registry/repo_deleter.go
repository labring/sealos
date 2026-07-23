// Copyright © 2024 sealos.
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

package registry

import (
	"context"
	"errors"
	"fmt"
	"net/http"

	"github.com/google/go-containerregistry/pkg/crane"
	"github.com/google/go-containerregistry/pkg/v1/remote/transport"
)

// RepoDeleter abstracts operations for deleting an entire repository (including all images).
type RepoDeleter interface {
	DeleteRepo(ctx context.Context, repo string) error
}

// CraneRepoDeleter implements RepoDeleter using crane.
type CraneRepoDeleter struct {
	options []crane.Option
}

// NewCraneRepoDeleter returns a new instance of CraneRepoDeleter with provided options.
func NewCraneRepoDeleter(opts ...crane.Option) *CraneRepoDeleter {
	return &CraneRepoDeleter{options: opts}
}

func isNotFound(err error) bool {
	var terr *transport.Error
	if errors.As(err, &terr) && terr.StatusCode == http.StatusNotFound {
		return true
	}
	return false
}

// DeleteRepo deletes all tags/images in the given repository.
// This effectively "deletes" the repository if it's empty.
func (d *CraneRepoDeleter) DeleteRepo(ctx context.Context, repo string) error {
	opts := append([]crane.Option{crane.WithContext(ctx)}, d.options...)

	tags, err := crane.ListTags(repo, opts...)
	if err != nil {
		// If the repo doesn't exist, treat it as already empty.
		if isNotFound(err) {
			return nil
		}
		return fmt.Errorf("list tags for repo %q: %w", repo, err)
	}
	if len(tags) == 0 {
		return nil
	}

	var errs []error
	for _, tag := range tags {
		ref := fmt.Sprintf("%s:%s", repo, tag)
		if err := crane.Delete(ref, opts...); err != nil {
			// If the tag doesn't exist, ignore and keep going.
			if isNotFound(err) {
				continue
			}
			errs = append(errs, fmt.Errorf("delete %q: %w", ref, err))
		}
	}
	if len(errs) > 0 {
		return errors.Join(errs...)
	}
	return nil
}
