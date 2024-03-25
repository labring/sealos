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

package database

import (
	"github.com/labring/sealos/controllers/pkg/utils/env"
)

const (
	DefaultAdminUserName = "admin"
	DefaultAdminPassword = "sealos2023"
)

const (
	EnvAdminUserName   = "ADMIN_USER_NAME"
	EnvAdminPassword   = "ADMIN_PASSWORD"
	EnvWorkspacePrefix = "WORKSPACE_PREFIX"
)

var (
	adminPassword   = hashPassword(env.GetEnvWithDefault(EnvAdminPassword, DefaultAdminPassword))
	adminUserName   = env.GetEnvWithDefault(EnvAdminUserName, DefaultAdminUserName)
	workspacePrefix = env.GetEnvWithDefault(EnvWorkspacePrefix, "ns-")
)
