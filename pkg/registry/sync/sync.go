/*
Copyright 2023 cuisongliu@qq.com.

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
*/

package sync

import (
	"context"
	"errors"
	"fmt"
	"io"
	"net"
	"net/http"
	"path/filepath"
	"strings"
	"time"

	"github.com/containers/image/v5/copy"
	"github.com/containers/image/v5/docker"
	"github.com/containers/image/v5/docker/reference"
	"github.com/containers/image/v5/signature"
	"github.com/containers/image/v5/types"

	"github.com/labring/sealos/pkg/utils/logger"
)

const (
	defaultPort = "5000"
)

func Image(ctx context.Context, sys *types.SystemContext, src, dst string, selection copy.ImageListSelection) error {
	policyContext, err := getPolicyContext()
	if err != nil {
		return err
	}
	repos, err := docker.SearchRegistry(ctx, sys, src, "", 1<<10)
	if err != nil {
		return err
	}
	if len(repos) == 0 {
		return nil
	}
	for i := range repos {
		named, err := parseRepositoryReference(fmt.Sprintf("%s/%s", src, repos[i].Name))
		if err != nil {
			return err
		}
		refs, err := imagesToCopyFromRepo(ctx, sys, named)
		if err != nil {
			return err
		}
		for j := range refs {
			destSuffix := strings.TrimPrefix(refs[j].DockerReference().String(), src)
			destRef, err := docker.ParseReference(fmt.Sprintf("//%s", filepath.Join(dst, destSuffix)))
			if err != nil {
				return err
			}
			_, err = copy.Image(ctx, policyContext, destRef, refs[j], &copy.Options{
				SourceCtx:          sys,
				DestinationCtx:     sys,
				ImageListSelection: selection,
			})
			if err != nil {
				return err
			}
		}
	}
	return nil
}

func getPolicyContext() (*signature.PolicyContext, error) {
	policy, err := signature.DefaultPolicy(nil)
	if err != nil {
		return nil, err
	}
	return signature.NewPolicyContext(policy)
}

func parseRepositoryReference(input string) (reference.Named, error) {
	ref, err := reference.ParseNormalizedNamed(input)
	if err != nil {
		return nil, err
	}
	if !reference.IsNameOnly(ref) {
		return nil, errors.New("input names a reference, not a repository")
	}
	return ref, nil
}

func imagesToCopyFromRepo(ctx context.Context, sys *types.SystemContext, repoRef reference.Named) ([]types.ImageReference, error) {
	tags, err := getImageTags(ctx, sys, repoRef)
	if err != nil {
		return nil, err
	}

	var sourceReferences []types.ImageReference
	for _, tag := range tags {
		taggedRef, err := reference.WithTag(repoRef, tag)
		if err != nil {
			logger.Error("Error creating a tagged reference from registry tag %s:%s list: %v", repoRef.Name(), tag, err)
			continue
		}
		ref, err := docker.NewReference(taggedRef)
		if err != nil {
			return nil, fmt.Errorf("cannot obtain a valid image reference for transport %q and reference %s: %w", docker.Transport.Name(), taggedRef.String(), err)
		}
		sourceReferences = append(sourceReferences, ref)
	}
	return sourceReferences, nil
}

func getImageTags(ctx context.Context, sysCtx *types.SystemContext, repoRef reference.Named) ([]string, error) {
	name := repoRef.Name()
	dockerRef, err := docker.NewReference(reference.TagNameOnly(repoRef))
	if err != nil {
		return nil, err
	}
	tags, err := docker.GetRepositoryTags(ctx, sysCtx, dockerRef)
	if err != nil {
		return nil, fmt.Errorf("error determining repository tag for %s: %v", name, err)
	}
	return tags, nil
}

func WaitUntilHTTPListen(endpoint string, tw time.Duration) bool {
	for {
		select {
		case <-time.After(tw):
			return false
		default:
			resp, err := http.DefaultClient.Get(endpoint)
			if err == nil {
				_, _ = io.Copy(io.Discard, resp.Body)
				resp.Body.Close()
				logger.Info("registry %s is listening , connect success", endpoint)
				return true
			}
			logger.Warn("connect to %s error: %v", endpoint, err)
			time.Sleep(100 * time.Millisecond)
		}
	}
}
func ParseRegistryAddress(s string, args ...string) (string, error) {
	if strings.Contains(s, ":") {
		host, _, err := net.SplitHostPort(s)
		if err != nil {
			return "", err
		}
		s = host
	}
	var portStr string
	if len(args) > 0 {
		portStr = args[0]
	}
	if idx := strings.Index(portStr, ":"); idx >= 0 {
		portStr = portStr[idx+1:]
	}
	if portStr == "" {
		portStr = defaultPort
	}
	return net.JoinHostPort(s, portStr), nil
}
