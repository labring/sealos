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
	"io"
	"net"
	"net/http"
	"path/filepath"
	"strings"
	"time"

	"github.com/containers/common/pkg/auth"
	"github.com/containers/image/v5/copy"
	"github.com/containers/image/v5/docker"
	"github.com/containers/image/v5/docker/reference"
	"github.com/containers/image/v5/signature"
	"github.com/containers/image/v5/types"
	"golang.org/x/sync/errgroup"

	"github.com/labring/sealos/pkg/constants"
	"github.com/labring/sealos/pkg/registry/handler"
	"github.com/labring/sealos/pkg/ssh"
	v2 "github.com/labring/sealos/pkg/types/v1beta1"
	"github.com/labring/sealos/pkg/utils/logger"
)

const (
	localhost            = "127.0.0.1"
	defaultPort          = "5000"
	defaultTemporaryPort = "5050"
)

// TODO: fallback to ssh mode when HTTP is not available
type syncMode struct {
	pathResolver PathResolver
	ssh          ssh.Interface
	mounts       []v2.MountImage
}

func (s *syncMode) Sync(ctx context.Context, hosts ...string) error {
	sys := &types.SystemContext{
		DockerInsecureSkipTLSVerify: types.OptionalBoolTrue,
	}
	// run `sealctl registry serve` to start a temporary registry
	for i := range hosts {
		ctx, cancel := context.WithCancel(ctx)
		// defer cancel async commands
		defer cancel()
		go func(ctx context.Context, host string) {
			logger.Debug("running temporary registry on host %s", host)
			if err := s.ssh.CmdAsyncWithContext(ctx, host, getRegistryServeCommand(s.pathResolver, defaultTemporaryPort)); err != nil {
				logger.Error(err)
			}
		}(ctx, hosts[i])
	}

	var endpoints []string
	for i := range hosts {
		ep, err := parseRegistryAddress(hosts[i], defaultTemporaryPort)
		if err != nil {
			return err
		}
		if !waitUntilHTTPListen("http://"+ep, time.Second*3) {
			return fmt.Errorf("cannot detect whether registry %s is listening, check manually", ep)
		}
		endpoints = append(endpoints, ep)
	}

	outerEg, ctx := errgroup.WithContext(ctx)
	for i := range s.mounts {
		mount := s.mounts[i]
		outerEg.Go(func() error {
			config, err := handler.NewConfig(
				filepath.Join(mount.MountPoint, constants.RegistryDirName), 0)
			if err != nil {
				return err
			}
			config.Log.AccessLog.Disabled = true
			errCh := handler.Run(ctx, config)
			eg, _ := errgroup.WithContext(ctx)
			for j := range endpoints {
				dst := endpoints[j]
				eg.Go(func() error {
					src, err := parseRegistryAddress(localhost, config.HTTP.Addr)
					if err != nil {
						return err
					}
					return syncRegistry(ctx, sys, src, dst)
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

func waitUntilHTTPListen(endpoint string, tw time.Duration) bool {
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

func getRegistryServeCommand(pathResolver PathResolver, port string) string {
	return fmt.Sprintf("%s registry serve filesystem -p %s --disable-logging=true %s",
		pathResolver.RootFSSealctlPath(), port, pathResolver.RootFSRegistryPath(),
	)
}

//lint:ignore U1000 Ignore unused function temporarily for debugging
func loginRegistry(ctx context.Context, sys *types.SystemContext, username, password, registry string) error {
	return auth.Login(ctx, sys, &auth.LoginOptions{
		Username: username,
		Password: password,
		Stdout:   io.Discard,
	}, []string{registry})
}

func syncRegistry(ctx context.Context, sys *types.SystemContext, src, dst string) error {
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

func parseRegistryAddress(s string, args ...string) (string, error) {
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
