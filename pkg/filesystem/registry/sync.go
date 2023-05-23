/*
Copyright 2023 fengxsong@outlook.com

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
package registry

import (
	"context"
	"errors"
	"fmt"
	"net"
	"path/filepath"
	"strings"

	"github.com/containers/image/v5/copy"
	"github.com/containers/image/v5/docker"
	"github.com/containers/image/v5/docker/reference"
	"github.com/containers/image/v5/signature"
	"github.com/containers/image/v5/types"
	"github.com/distribution/distribution/v3/registry/listener"
	"golang.org/x/sync/errgroup"

	"github.com/labring/sealos/pkg/constants"
	"github.com/labring/sealos/pkg/registry/handler"
	v2 "github.com/labring/sealos/pkg/types/v1beta1"
	"github.com/labring/sealos/pkg/utils/logger"
)

// TODO: fallback to ssh mode when HTTP is not available
type syncMode struct {
	mounts []v2.MountImage
}

func (s *syncMode) Sync(ctx context.Context, hosts ...string) error {
	outerEg, ctx := errgroup.WithContext(ctx)
	for i := range s.mounts {
		mount := s.mounts[i]
		outerEg.Go(func() error {
			config, err := handler.NewConfigWithRoot(filepath.Join(mount.MountPoint, constants.RegistryDirName))
			if err != nil {
				return err
			}
			ln, err := listener.NewListener(config.HTTP.Net, config.HTTP.Addr)
			if err != nil {
				return err
			}
			srv, err := handler.New(ctx, config)
			if err != nil {
				return err
			}
			errCh := make(chan error, 1)
			go func() {
				errCh <- srv.Serve(ln)
			}()
			defer func() {
				_ = srv.Shutdown(ctx)
			}()
			eg, _ := errgroup.WithContext(ctx)
			for j := range hosts {
				host := hosts[j]
				eg.Go(func() error {
					src, err := parseDefaultRegistryAddress("127.0.0.1", config.HTTP.Addr)
					if err != nil {
						return err
					}
					dst, err := parseDefaultRegistryAddress(host, "5000")
					if err != nil {
						return err
					}
					return syncRegistry(ctx, src, dst)
				})
			}
			go func() {
				errCh <- eg.Wait()
			}()
			return <-errCh
		})
	}
	return outerEg.Wait()
}

func syncRegistry(ctx context.Context, src, dst string) error {
	policyContext, err := getPolicyContext()
	if err != nil {
		return err
	}
	sys := &types.SystemContext{
		DockerInsecureSkipTLSVerify: types.OptionalBoolTrue,
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
				ImageListSelection: copy.CopySystemImage,
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

func parseDefaultRegistryAddress(s string, port ...string) (string, error) {
	if strings.Contains(s, ":") {
		host, _, err := net.SplitHostPort(s)
		if err != nil {
			return "", err
		}
		s = host
	}
	var portStr string
	if len(port) > 0 {
		portStr = port[0]
	}
	if idx := strings.Index(portStr, ":"); idx >= 0 {
		portStr = portStr[idx+1:]
	}
	if portStr == "" {
		portStr = "5000"
	}
	return net.JoinHostPort(s, portStr), nil
}
