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

// RoleAttribute is the attribute for role.
type RoleAttribute struct {
	SuperUser   bool `json:"superUser"`
	NoInherit   bool `json:"noInherit"`
	CreateRole  bool `json:"createRole"`
	CreateDB    bool `json:"createDb"`
	CanLogin    bool `json:"canLogin"`
	Replication bool `json:"replication"`
	ByPassRLS   bool `json:"bypassRls"`
}

// Role is the API message for role.
type Role struct {
	Name            string         `json:"name"`
	RoleName        string         `json:"roleName"`
	ConnectionLimit int            `json:"connectionLimit"`
	ValidUntil      *string        `json:"validUntil"`
	Attribute       *RoleAttribute `json:"attribute"`
}

// RoleUpsert is the API message for upserting a new role.
type RoleUpsert struct {
	RoleName        string         `json:"roleName"`
	Password        *string        `json:"password"`
	ConnectionLimit *int           `json:"connectionLimit"`
	ValidUntil      *string        `json:"validUntil"`
	Attribute       *RoleAttribute `json:"attribute"`
}
