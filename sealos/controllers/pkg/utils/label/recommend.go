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

package label

type Recommended struct {
	Name      string
	Instance  string
	Version   string
	Component string
	PartOf    string
	ManagedBy string
}

func (r *Recommended) Labels() map[string]string {
	ret := map[string]string{}

	if r.Name != "" {
		ret[AppName] = r.Name
	}
	if r.Instance != "" {
		ret[AppInstance] = r.Instance
	}
	if r.Version != "" {
		ret[AppVersion] = r.Version
	}
	if r.Component != "" {
		ret[AppComponent] = r.Component
	}
	if r.PartOf != "" {
		ret[AppPartOf] = r.PartOf
	}
	if r.ManagedBy != "" {
		ret[AppManagedBy] = r.ManagedBy
	}

	return ret
}

func RecommendedLabels(r *Recommended) map[string]string {
	return r.Labels()
}
