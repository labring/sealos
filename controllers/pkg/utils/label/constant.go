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

type AppKey = string

// @see: https://kubernetes.io/docs/concepts/overview/working-with-objects/common-labels/#labels
const (
	AppName      AppKey = "app.kubernetes.io/name"
	AppInstance  AppKey = "app.kubernetes.io/instance"
	AppVersion   AppKey = "app.kubernetes.io/version"
	AppComponent AppKey = "app.kubernetes.io/component"
	AppPartOf    AppKey = "app.kubernetes.io/part-of"
	AppManagedBy AppKey = "app.kubernetes.io/managed-by"
)

const (
	DefaultManagedBy = "sealos"
)
