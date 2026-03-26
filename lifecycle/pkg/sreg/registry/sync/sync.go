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
	"os"
	"path/filepath"
	"strings"

	gcrane "github.com/google/go-containerregistry/pkg/crane"
	"github.com/google/go-containerregistry/pkg/name"

	"github.com/containers/common/pkg/retry"
	"github.com/containers/image/v5/copy"
	"github.com/containers/image/v5/docker"
	"github.com/containers/image/v5/docker/daemon"
	"github.com/containers/image/v5/docker/reference"
	"github.com/containers/image/v5/signature"
	"github.com/containers/image/v5/transports/alltransports"
	"github.com/containers/image/v5/types"
	dtype "github.com/docker/docker/api/types/registry"

	"github.com/labring/sealos/pkg/sreg/registry/crane"
	"github.com/labring/sealos/pkg/sreg/utils/logger"
)

const (
	defaultPort = "5000"
)

type Options struct {
	Source           string
	Target           string
	SelectionOptions []copy.ImageListSelection
	OmitError        bool
	SystemContext    *types.SystemContext
	ReportWriter     io.Writer
	Auths            map[string]dtype.AuthConfig
}

func ToRegistry(ctx context.Context, opts *Options) error {
	src := opts.Source
	dst := opts.Target
	sys := opts.SystemContext
	reportWriter := opts.ReportWriter
	srcSys := systemContextWithAuth(sys, opts.Auths, src)
	dstSys := systemContextWithAuth(sys, opts.Auths, dst)

	policyContext, err := getPolicyContext()
	if err != nil {
		return err
	}
	var allError error
	defer func() {
		if err := policyContext.Destroy(); err != nil {
			allError = fmt.Errorf("error tearing down policy context: %v", err)
		}
	}()
	repos, err := docker.SearchRegistry(ctx, srcSys, src, "", 1<<10)
	if err != nil {
		return err
	}
	if len(repos) == 0 {
		return nil
	}
	if reportWriter == nil {
		reportWriter = io.Discard
	}
	logger.Debug("syncing repos %v from %s to %s", repos, src, dst)
	for i := range repos {
		named, err := parseRepositoryReference(fmt.Sprintf("%s/%s", src, repos[i].Name))
		if err != nil {
			return err
		}

		refs, err := imagesToCopyFromRepo(ctx, srcSys, named)
		if err != nil {
			return err
		}
		for j := range refs {
			destSuffix := strings.TrimPrefix(refs[j].DockerReference().String(), src)
			destRef, err := docker.ParseReference(fmt.Sprintf("//%s", filepath.Join(dst, destSuffix)))
			if err != nil {
				return err
			}
			ref := refs[j]
			for s := range opts.SelectionOptions {
				selection := opts.SelectionOptions[s]
				logger.Debug("syncing %s with selection %v", destRef.DockerReference().String(), selection)
				if err = copyImageWithFallback(ctx, policyContext, ref, destRef, srcSys, dstSys, reportWriter, opts.Auths, selection); err != nil {
					if strings.Contains(err.Error(), "manifest unknown") && selection == copy.CopyAllImages {
						continue
					}
					if !opts.OmitError {
						return err
					}
					logger.Warn("failed to copy image %s: %v", refs[j].DockerReference().String(), err)
				}
			}
		}
	}
	return allError
}

func copyImageWithFallback(ctx context.Context, policyContext *signature.PolicyContext, srcRef, destRef types.ImageReference, srcSys, dstSys *types.SystemContext, reportWriter io.Writer, auths map[string]dtype.AuthConfig, selection copy.ImageListSelection) error {
	err := retry.RetryIfNecessary(ctx, func() error {
		_, copyErr := copy.Image(ctx, policyContext, destRef, srcRef, &copy.Options{
			SourceCtx:          srcSys,
			DestinationCtx:     dstSys,
			ImageListSelection: selection,
			ReportWriter:       reportWriter,
		})
		return copyErr
	}, getRetryOptions())
	if err == nil || !isUnsupportedOCIV2S2MediaTypeError(err) {
		return err
	}

	logger.Debug("fallback to remote registry copy for %s -> %s due to OCI media type compatibility error", srcRef.DockerReference().String(), destRef.DockerReference().String())
	return retry.RetryIfNecessary(ctx, func() error {
		return remoteCopyImage(srcRef.DockerReference().String(), destRef.DockerReference().String(), auths)
	}, getRetryOptions())
}

func isUnsupportedOCIV2S2MediaTypeError(err error) bool {
	if err == nil {
		return false
	}
	msg := err.Error()
	return strings.Contains(msg, "unsupported docker v2s2 media type") &&
		strings.Contains(msg, "application/vnd.oci.image.layer.v1.tar+gzip")
}

func remoteCopyImage(src, dst string, auths map[string]dtype.AuthConfig) error {
	options := crane.GetCraneOptions(auths)
	options = append(options, gcrane.Insecure)
	return gcrane.Copy(src, dst, options...)
}

func getRetryOptions() *retry.RetryOptions {
	return &retry.RetryOptions{
		MaxRetry: 3,
		IsErrorRetryable: func(err error) bool {
			if strings.Contains(err.Error(), "500 Internal Server Error") {
				return true
			}
			return retry.IsErrorRetryable(err)
		},
	}
}

func ImageNameToReference(sys *types.SystemContext, img string, auth map[string]dtype.AuthConfig) (types.ImageReference, error) {
	if err := reexecIfNecessaryForImages(img); err != nil {
		return nil, err
	}
	transport := alltransports.TransportFromImageName(img)
	if transport != nil && transport.Name() == "containers-storage" {
		logger.Info("Using containers-storage as image transport")
		srcRef, err := alltransports.ParseImageName(img)
		if err != nil {
			return nil, fmt.Errorf("invalid source name %s: %v", img, err)
		}
		return srcRef, nil
	}
	if transport != nil && transport.Name() == "docker-daemon" {
		logger.Info("Using docker-daemon as image transport")
		srcRef, err := alltransports.ParseImageName(img)
		if err != nil {
			return nil, fmt.Errorf("invalid source name %s: %v", img, err)
		}
		return srcRef, nil
	}

	src, err := name.ParseReference(img)
	if err != nil {
		return nil, fmt.Errorf("ref invalid source name %s: %v", img, err)
	}
	reg := src.Context().RegistryStr()
	info, ok := auth[reg]
	if sys != nil {
		if ok {
			sys.DockerAuthConfig = &types.DockerAuthConfig{
				Username:      info.Username,
				Password:      info.Password,
				IdentityToken: info.IdentityToken,
			}
		} else {
			sys.DockerAuthConfig = nil
		}
	}
	image := src.Name()
	srcRef, err := alltransports.ParseImageName(fmt.Sprintf("docker://%s", image))
	if err != nil {
		return nil, fmt.Errorf("invalid source name %s: %v", src, err)
	}
	return srcRef, nil
}

func RegistryToImage(ctx context.Context, sys *types.SystemContext, src types.ImageReference, dst string, selection copy.ImageListSelection) error {
	allSrcImage := src.DockerReference().String()
	var repo string
	parts := strings.SplitN(allSrcImage, "/", 2)
	if len(parts) == 2 && (strings.ContainsRune(parts[0], '.') || strings.ContainsRune(parts[0], ':')) {
		// The first part of the repository is treated as the registry domain
		// iff it contains a '.' or ':' character, otherwise it is all repository
		// and the domain defaults to Docker Hub.
		_ = parts[0]
		repo = parts[1]
	}
	logger.Debug("syncing image from %s to %s", allSrcImage, dst)
	//named.
	dstImage := strings.Join([]string{dst, repo}, "/")
	destRef, err := alltransports.ParseImageName(fmt.Sprintf("docker://%s", dstImage))
	if err != nil {
		return fmt.Errorf("invalid destination name %s: %v", dst, err)
	}
	policyContext, err := getPolicyContext()
	if err != nil {
		return err
	}
	var allError error
	defer func() {
		if err := policyContext.Destroy(); err != nil {
			allError = fmt.Errorf("error tearing down policy context: %v", err)
		}
	}()
	if err = retry.RetryIfNecessary(ctx, func() error {
		_, err = copy.Image(ctx, policyContext, destRef, src, &copy.Options{
			SourceCtx:          sys,
			DestinationCtx:     sys,
			ImageListSelection: selection,
			ReportWriter:       os.Stdout,
		})
		return err
	}, getRetryOptions()); err != nil {
		return err
	}
	return allError
}

func ArchiveToImage(ctx context.Context, sys *types.SystemContext, src types.ImageReference, dst string, selection copy.ImageListSelection) error {
	logger.Debug("syncing image from %s to %s", src.Transport().Name(), dst)
	destRef, err := alltransports.ParseImageName(fmt.Sprintf("docker://%s", dst))
	if err != nil {
		return fmt.Errorf("invalid destination name %s: %v", dst, err)
	}
	policyContext, err := getPolicyContext()
	if err != nil {
		return err
	}
	var allError error
	defer func() {
		if err = policyContext.Destroy(); err != nil {
			allError = fmt.Errorf("error tearing down policy context: %v", err)
		}
	}()
	if err = retry.RetryIfNecessary(ctx, func() error {
		_, err = copy.Image(ctx, policyContext, destRef, src, &copy.Options{
			SourceCtx:          sys,
			DestinationCtx:     sys,
			ImageListSelection: selection,
			ReportWriter:       os.Stdout,
		})
		return err
	}, getRetryOptions()); err != nil {
		return err
	}
	return allError
}

func getPolicyContext() (*signature.PolicyContext, error) {
	policy := &signature.Policy{
		Default: []signature.PolicyRequirement{
			signature.NewPRInsecureAcceptAnything(),
		},
		Transports: map[string]signature.PolicyTransportScopes{
			daemon.Transport.Name(): {
				"": signature.PolicyRequirements{signature.NewPRInsecureAcceptAnything()},
			},
		},
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

func ParseRegistryAddress(s string, args ...string) string {
	if strings.Contains(s, ":") {
		return s
	}

	var portStr string
	if len(args) > 0 {
		portStr = args[0]
	} else {
		portStr = defaultPort
	}
	if idx := strings.Index(portStr, ":"); idx >= 0 {
		portStr = portStr[idx+1:]
	}
	return net.JoinHostPort(s, portStr)
}

func systemContextWithAuth(base *types.SystemContext, auths map[string]dtype.AuthConfig, registry string) *types.SystemContext {
	ctx := cloneSystemContext(base)
	auth, ok := lookupRegistryAuth(auths, registry)
	if !ok {
		return ctx
	}

	ctx.DockerAuthConfig = &types.DockerAuthConfig{
		Username:      auth.Username,
		Password:      auth.Password,
		IdentityToken: auth.IdentityToken,
	}
	return ctx
}

func cloneSystemContext(base *types.SystemContext) *types.SystemContext {
	if base == nil {
		return &types.SystemContext{}
	}
	cloned := *base
	cloned.DockerAuthConfig = nil
	return &cloned
}

func lookupRegistryAuth(auths map[string]dtype.AuthConfig, registry string) (dtype.AuthConfig, bool) {
	if len(auths) == 0 {
		return dtype.AuthConfig{}, false
	}

	candidates := []string{
		registry,
		strings.TrimPrefix(registry, "http://"),
		strings.TrimPrefix(registry, "https://"),
	}

	normalized := crane.NormalizeRegistry(crane.GetRegistryDomain(registry))
	candidates = append(candidates, normalized)
	if normalized == "docker.io" {
		candidates = append(candidates, "registry-1.docker.io", "index.docker.io")
	}

	for _, key := range candidates {
		if key == "" {
			continue
		}
		if auth, ok := auths[key]; ok {
			return auth, true
		}
	}
	return dtype.AuthConfig{}, false
}
