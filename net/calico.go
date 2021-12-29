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

package net

type Calico struct {
	metadata MetaData
}

func (c Calico) Manifests(template string) string {
	if template == "" {
		template = c.Template()
	}
	if c.metadata.Interface == "" {
		c.metadata.Interface = "interface=" + defaultInterface
	}
	if c.metadata.CIDR == "" {
		c.metadata.CIDR = defaultCIDR
	}

	if c.metadata.CniRepo == "" || c.metadata.CniRepo == defaultCNIRepo {
		c.metadata.CniRepo = "calico"
	}

	if c.metadata.Version == "" {
		c.metadata.Version = "v3.8.2"
	}

	return render(c.metadata, template)
}

func (c Calico) Template() string {
	switch c.metadata.Version {
	case "v3.19.1":
		return CalicoV3191Manifests
	case "v3.8.2":
		return CalicoManifests
	default:
		return CalicoManifests
	}
}
