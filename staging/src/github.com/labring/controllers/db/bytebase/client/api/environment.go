// Copyright © 2023 sealos.
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

package api

// EnvironmentMessage is the API message for an environment.
type EnvironmentMessage struct {
	UID string `json:"uid"`

	// Domain specific fields
	Name  string `json:"name"`
	Title string `json:"title"`
	Order int    `json:"order"`
	State State  `json:"state,omitempty"`
	Tier  string `json:"tier"`
}

// ListEnvironmentMessage is the API message for list environment response.
type ListEnvironmentMessage struct {
	Environments  []*EnvironmentMessage `json:"environments"`
	NextPageToken string                `json:"nextPageToken"`
}

// EnvironmentPatchMessage is the API message to patch the environment.
type EnvironmentPatchMessage struct {
	Title *string `json:"title,omitempty"`
	Order *int    `json:"order,omitempty"`
	Tier  *string `json:"tier,omitempty"`
}
