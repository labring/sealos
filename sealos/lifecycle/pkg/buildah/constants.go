// Copyright © 2022 sealos.
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

package buildah

import (
	"fmt"
	"strings"

	"github.com/containers/buildah/define"
	"github.com/containers/image/v5/directory"
	"github.com/containers/image/v5/docker"
	"github.com/containers/image/v5/docker/archive"
	ociarchive "github.com/containers/image/v5/oci/archive"
	"github.com/containers/image/v5/oci/layout"
	"github.com/containers/image/v5/openshift"
	"github.com/containers/image/v5/sif"
	"github.com/containers/image/v5/storage"
	"github.com/containers/image/v5/tarball"
)

const (
	OCIArchive        string = "oci-archive"
	OCIManifestDir    string = "oci-dir"
	DockerArchive     string = "docker-archive"
	DockerManifestDir string = "docker-dir"
)

var DefaultTransport = OCIArchive

func ValidateTransport(s string) error {
	switch s {
	case OCIArchive, DockerArchive:
	default:
		return fmt.Errorf("unsupported transport %s, available options are %s", s, strings.Join([]string{OCIArchive, DockerArchive}, ", "))
	}
	return nil
}

const (
	DisableAutoRootless = "DISABLE_AUTO_ROOTLESS"
)

const (
	PullIfMissing = define.PullIfMissing
	PullAlways    = define.PullAlways
	PullIfNewer   = define.PullIfNewer
	PullNever     = define.PullNever
)

var (
	TransportDir               = directory.Transport.Name()
	TransportDocker            = docker.Transport.Name()
	TransportDockerArchive     = archive.Transport.Name()
	TransportOCIArchive        = ociarchive.Transport.Name()
	TransportOCI               = layout.Transport.Name()
	TransportAtomic            = openshift.Transport.Name()
	TransportSif               = sif.Transport.Name()
	TransportTarball           = tarball.Transport.Name()
	TransportContainersStorage = storage.Transport.Name()
)

func FormatReferenceWithTransportName(tr string, ref string) string {
	switch tr {
	case TransportAtomic, TransportContainersStorage, TransportDir, TransportDockerArchive, TransportOCI, TransportOCIArchive, TransportTarball, TransportSif:
		return tr + ":" + ref
	case TransportDocker:
		return tr + "://" + ref
	default:
		panic(fmt.Errorf("unknown transport %s", tr))
	}
}
