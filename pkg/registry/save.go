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

package registry

import (
	"bufio"
	"context"
	"fmt"
	"io"
	"os"
	"strings"
	"sync"

	"k8s.io/apimachinery/pkg/util/sets"

	"github.com/labring/sealos/pkg/passwd"
	"github.com/labring/sealos/pkg/utils/http"
	"github.com/labring/sealos/pkg/utils/logger"

	distribution "github.com/distribution/distribution/v3"
	"github.com/distribution/distribution/v3/configuration"
	"github.com/distribution/distribution/v3/reference"
	"github.com/distribution/distribution/v3/registry/storage"
	"github.com/distribution/distribution/v3/registry/storage/driver/factory"
	dockerstreams "github.com/docker/cli/cli/streams"
	"github.com/docker/docker/api/types"
	dockerjsonmessage "github.com/docker/docker/pkg/jsonmessage"
	"github.com/docker/docker/pkg/progress"
	"github.com/docker/docker/pkg/streamformatter"
	"github.com/opencontainers/go-digest"
	v1 "github.com/opencontainers/image-spec/specs-go/v1"
	"github.com/pkg/errors"
	"golang.org/x/sync/errgroup"

	"github.com/labring/sealos/pkg/registry/distributionpkg/proxy"
)

const (
	HTTPS           = "https://"
	HTTP            = "http://"
	defaultProxyURL = "https://registry-1.docker.io"
	configRootDir   = "rootdirectory"

	manifestV2       = "application/vnd.docker.distribution.manifest.v2+json"
	manifestOCI      = "application/vnd.oci.image.manifest.v1+json"
	manifestList     = "application/vnd.docker.distribution.manifest.list.v2+json"
	manifestOCIIndex = "application/vnd.oci.image.index.v1+json"
)

func (is *DefaultImage) SaveImages(images []string, dir string, platform v1.Platform) ([]string, error) {
	logger.Debug("search images  platform: %s , dir: %s, image list: %+v", strings.Join([]string{platform.OS, platform.Architecture, platform.Variant}, ","), dir, images)
	//init a pipe for display pull message
	reader, writer := io.Pipe()
	defer func() {
		_ = reader.Close()
		_ = writer.Close()
	}()
	is.progressOut = streamformatter.NewJSONProgressOutput(writer, false)

	go func() {
		err := dockerjsonmessage.DisplayJSONMessagesToStream(reader, dockerstreams.NewOut(os.Stdout), nil)
		if err != nil && err != io.ErrClosedPipe {
			logger.Warn("error occurs in display progressing, err: %s", err)
		}
	}()

	//handle image name
	pullImages := sets.NewString()
	for _, image := range images {
		named, err := ParseNormalizedNamed(image)
		if err != nil {
			return nil, fmt.Errorf("parse image name error: %v", err)
		}
		if pullImages.Has(named.FullName()) {
			continue
		}
		is.domainToImages[named.domain+named.repo] = append(is.domainToImages[named.domain+named.repo], named)
		progress.Message(is.progressOut, "", fmt.Sprintf("Pulling image: %s", named.FullName()))
		pullImages.Insert(named.FullName())
	}

	//perform image save ability
	eg, _ := errgroup.WithContext(context.Background())
	numCh := make(chan struct{}, is.maxPullProcs)
	var outImages []string
	var mu sync.Mutex
	for _, nameds := range is.domainToImages {
		tmpnameds := nameds
		numCh <- struct{}{}
		eg.Go(func() error {
			auth := is.auths[tmpnameds[0].domain]
			if auth.ServerAddress == "" {
				auth.ServerAddress = tmpnameds[0].domain
			}
			registry, err := NewProxyRegistry(is.ctx, dir, auth)
			if err != nil {
				return fmt.Errorf("init registry error: %v", err)
			}
			mu.Lock()
			defer func() {
				<-numCh
				mu.Unlock()
			}()

			err = is.save(tmpnameds, platform, registry)
			if err != nil {
				return errors.WithMessagef(err, "save domain %s image %s", tmpnameds[0].domain, tmpnameds[0].FullName())
			}
			outImages = append(outImages, tmpnameds[0].FullName())
			return nil
		})
	}
	if err := eg.Wait(); err != nil {
		return nil, err
	}
	if len(images) != 0 {
		progress.Message(is.progressOut, "", "Status: images save success")
	}
	return outImages, nil
}

func authConfigToProxy(auth types.AuthConfig) configuration.Proxy {
	// set the URL of registry
	if auth.ServerAddress == defaultDomain || auth.ServerAddress == "" {
		auth.ServerAddress = defaultProxyURL
	}
	if _, ok := http.IsURL(auth.ServerAddress); !ok {
		auth.ServerAddress = HTTPS + auth.ServerAddress
	}
	if auth.Auth != "" && auth.Username == "" && auth.Password == "" {
		uPassword, _ := passwd.LoginAuthDecode(auth.Auth)
		if data := strings.Split(uPassword, ":"); len(data) > 1 {
			auth.Username = data[0]
			auth.Password = data[1]
		}
	}

	return configuration.Proxy{
		RemoteURL: auth.ServerAddress,
		Username:  auth.Username,
		Password:  auth.Password,
	}
}

func NewProxyRegistry(ctx context.Context, rootdir string, auth types.AuthConfig) (distribution.Namespace, error) {
	config := configuration.Configuration{
		Proxy: authConfigToProxy(auth),
		Storage: configuration.Storage{
			driverName: configuration.Parameters{configRootDir: rootdir},
		},
	}

	driver, err := factory.Create(config.Storage.Type(), config.Storage.Parameters())
	if err != nil {
		return nil, fmt.Errorf("create storage driver error: %v", err)
	}

	//create a local registry service
	registry, err := storage.NewRegistry(ctx, driver, make([]storage.RegistryOption, 0)...)
	if err != nil {
		return nil, fmt.Errorf("create local registry error: %v", err)
	}

	proxyRegistry, err := proxy.NewRegistryPullThroughCache(ctx, registry, config.Proxy)
	if err != nil { // try http
		logger.Warn("https error: %v, sealos try to use http", err)
		config.Proxy.RemoteURL = strings.Replace(config.Proxy.RemoteURL, HTTPS, HTTP, 1)
		proxyRegistry, err = proxy.NewRegistryPullThroughCache(ctx, registry, config.Proxy)
		if err != nil {
			return nil, fmt.Errorf("create proxy registry error: %v", err)
		}
	}
	return proxyRegistry, nil
}

func (is *DefaultImage) save(nameds []Named, platform v1.Platform, registry distribution.Namespace) error {
	repo, err := is.getRepository(nameds[0], registry)
	if err != nil {
		return err
	}

	imageDigests, err := is.saveManifestAndGetDigest(nameds, repo, platform)
	if err != nil {
		return err
	}

	err = is.saveBlobs(imageDigests, repo)
	if err != nil {
		return err
	}

	return nil
}

func (is *DefaultImage) getRepository(named Named, registry distribution.Namespace) (distribution.Repository, error) {
	repoName, err := reference.WithName(named.Repo())
	if err != nil {
		return nil, fmt.Errorf("get repository name error: %v", err)
	}
	repo, err := registry.Repository(is.ctx, repoName)
	if err != nil {
		return nil, fmt.Errorf("get repository error: %v", err)
	}
	return repo, nil
}

func (is *DefaultImage) saveManifestAndGetDigest(nameds []Named, repo distribution.Repository, platform v1.Platform) ([]digest.Digest, error) {
	manifest, err := repo.Manifests(is.ctx, make([]distribution.ManifestServiceOption, 0)...)
	if err != nil {
		return nil, fmt.Errorf("get manifest service error: %v", err)
	}
	eg, _ := errgroup.WithContext(context.Background())
	numCh := make(chan struct{}, is.maxPullProcs)
	imageDigests := make([]digest.Digest, 0)
	for _, named := range nameds {
		tmpnamed := named
		numCh <- struct{}{}
		eg.Go(func() error {
			defer func() {
				<-numCh
			}()

			desc, err := repo.Tags(is.ctx).Get(is.ctx, tmpnamed.tag)
			if err != nil {
				return fmt.Errorf("get %s tag descriptor error: %v, try \"sealos login\" if you are using a private registry", tmpnamed.repo, err)
			}
			imageDigest, err := is.handleManifest(manifest, desc.Digest, platform)
			if err != nil {
				return fmt.Errorf("get digest error: %v", err)
			}
			imageDigests = append(imageDigests, imageDigest)
			return nil
		})
	}
	if err := eg.Wait(); err != nil {
		return nil, err
	}

	return imageDigests, nil
}

func (is *DefaultImage) handleManifest(manifest distribution.ManifestService, imagedigest digest.Digest, platform v1.Platform) (digest.Digest, error) {
	mani, err := manifest.Get(is.ctx, imagedigest, make([]distribution.ManifestServiceOption, 0)...)
	if err != nil {
		return digest.Digest(""), fmt.Errorf("get image manifest error: %v", err)
	}
	ct, p, err := mani.Payload()
	if err != nil {
		return digest.Digest(""), fmt.Errorf("failed to get image manifest payload: %v", err)
	}

	switch ct {
	case manifestV2, manifestOCI:
		return imagedigest, nil
	case manifestList, manifestOCIIndex:
		imageDigest, err := getImageManifestDigest(p, platform)
		if err != nil {
			return digest.Digest(""), fmt.Errorf("get digest from manifest list error: %v", err)
		}
		return imageDigest, nil
	case "":
		//OCI image or image index - no media type in the content

		//First see if it is a list
		imageDigest, _ := getImageManifestDigest(p, platform)
		if imageDigest != "" {
			return imageDigest, nil
		}
		//If not list, then assume it must be an image manifest
		return imagedigest, nil
	default:
		return digest.Digest(""), fmt.Errorf("unrecognized manifest content type")
	}
}

func (is *DefaultImage) saveBlobs(imageDigests []digest.Digest, repo distribution.Repository) error {
	manifest, err := repo.Manifests(is.ctx, make([]distribution.ManifestServiceOption, 0)...)
	if err != nil {
		return fmt.Errorf("failed to get blob service: %v", err)
	}
	eg, _ := errgroup.WithContext(context.Background())
	numCh := make(chan struct{}, is.maxPullProcs)
	blobLists := make([]digest.Digest, 0)

	//get blob list
	//each blob identified by a digest
	for _, imageDigest := range imageDigests {
		tmpImageDigest := imageDigest
		numCh <- struct{}{}
		eg.Go(func() error {
			defer func() {
				<-numCh
			}()

			blobListJSON, err := manifest.Get(is.ctx, tmpImageDigest, make([]distribution.ManifestServiceOption, 0)...)
			if err != nil {
				return err
			}

			blobList, err := getBlobList(blobListJSON)
			if err != nil {
				return fmt.Errorf("failed to get blob list: %v", err)
			}
			blobLists = append(blobLists, blobList...)
			return nil
		})
	}
	if err = eg.Wait(); err != nil {
		return err
	}

	//pull and save each blob
	blobStore := repo.Blobs(is.ctx)
	type localStore interface {
		Local(context.Context) (distribution.BlobStore, error)
	}
	ls, _ := blobStore.(localStore).Local(is.ctx)
	for _, blob := range blobLists {
		tmpBlob := blob
		numCh <- struct{}{}
		eg.Go(func() error {
			defer func() {
				<-numCh
			}()

			simpleDgst := string(tmpBlob)[7:19]

			_, err = blobStore.Stat(is.ctx, tmpBlob)
			if err == nil { //blob already exist
				progress.Update(is.progressOut, simpleDgst, "already exists")
				return nil
			}
			reader, err := blobStore.Open(is.ctx, tmpBlob)
			if err != nil {
				return fmt.Errorf("failed to get blob %s: %v", tmpBlob, err)
			}

			size, err := reader.Seek(0, io.SeekEnd)
			if err != nil {
				return fmt.Errorf("seek end error when save blob %s: %v", tmpBlob, err)
			}
			_, err = reader.Seek(0, io.SeekStart)
			if err != nil {
				return fmt.Errorf("failed to seek start when save blob %s: %v", tmpBlob, err)
			}
			preader := progress.NewProgressReader(reader, is.progressOut, size, simpleDgst, "Downloading")

			defer func() {
				_ = reader.Close()
				_ = preader.Close()
				progress.Update(is.progressOut, simpleDgst, "Download complete")
			}()

			// store to local filesystem
			bf := bufio.NewReader(preader)
			bw, err := ls.Create(is.ctx)
			if err != nil {
				return fmt.Errorf("failed to create local blob writer: %v", err)
			}
			if _, err = bf.WriteTo(bw); err != nil {
				return fmt.Errorf("failed to write blob to service: %v", err)
			}
			_, err = bw.Commit(is.ctx, distribution.Descriptor{
				MediaType: "",
				Size:      bw.Size(),
				Digest:    tmpBlob,
			})
			if err != nil {
				return fmt.Errorf("failed to commit blob %s to local: %v", tmpBlob, err)
			}

			return nil
		})
	}

	return eg.Wait()
}
