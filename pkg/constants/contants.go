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

package constants

import (
	"github.com/containers/storage/pkg/homedir"
)

const (
	LvsCareStaticPodName     = "kube-sealos-lvscare"
	YamlFileSuffix           = "yaml"
	DefaultRegistryDomain    = "sealos.hub"
	DefaultRegistryUsername  = "admin"
	DefaultRegistryPassword  = "passw0rd"
	DefaultRegistryData      = "/var/lib/registry"
	DefaultLvscareDomain     = "lvscare.node.ip"
	DefaultLvsCareImage      = "sealos.hub:5000/sealos/lvscare:latest"
	ImageKubeVersionKey      = "version"
	ImageVIPKey              = "vip"
	ImageKubeLvscareImageKey = "image"
	ImageTypeKey             = "sealos.io.type"
	DefaultHostsPath         = "/etc/hosts"
)

// CRD kind
const (
	Config  = "Config"
	Cluster = "Cluster"
)

func GetHomeDir() string {
	return homedir.Get()
}

var Contact = `
      ___           ___           ___           ___       ___           ___
     /\  \         /\  \         /\  \         /\__\     /\  \         /\  \
    /::\  \       /::\  \       /::\  \       /:/  /    /::\  \       /::\  \
   /:/\ \  \     /:/\:\  \     /:/\:\  \     /:/  /    /:/\:\  \     /:/\ \  \
  _\:\~\ \  \   /::\~\:\  \   /::\~\:\  \   /:/  /    /:/  \:\  \   _\:\~\ \  \
 /\ \:\ \ \__\ /:/\:\ \:\__\ /:/\:\ \:\__\ /:/__/    /:/__/ \:\__\ /\ \:\ \ \__\
 \:\ \:\ \/__/ \:\~\:\ \/__/ \/__\:\/:/  / \:\  \    \:\  \ /:/  / \:\ \:\ \/__/
  \:\ \:\__\    \:\ \:\__\        \::/  /   \:\  \    \:\  /:/  /   \:\ \:\__\
   \:\/:/  /     \:\ \/__/        /:/  /     \:\  \    \:\/:/  /     \:\/:/  /
    \::/  /       \:\__\         /:/  /       \:\__\    \::/  /       \::/  /
     \/__/         \/__/         \/__/         \/__/     \/__/         \/__/

                  Website :https://www.sealos.io/
                  Address :github.com/labring/sealos
		BuildVersion: %s
`
