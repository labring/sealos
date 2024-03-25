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
	"fmt"
	"os"
	"time"

	"github.com/google/uuid"

	"github.com/labring/sealos/controllers/pkg/utils/retry"

	"github.com/labring/sealos/controllers/job/init/internal/util/common"

	gonanoid "github.com/matoous/go-nanoid/v2"

	"github.com/labring/sealos/controllers/pkg/database"
	"github.com/labring/sealos/controllers/pkg/utils/logger"

	"github.com/labring/sealos/controllers/pkg/database/cockroach"
	"github.com/labring/sealos/controllers/pkg/types"
)

func PresetAdminUser() error {
	v2Account, err := cockroach.NewCockRoach(os.Getenv(database.GlobalCockroachURI), os.Getenv(database.LocalCockroachURI))
	if err != nil {
		return fmt.Errorf("failed to connect to cockroach: %v", err)
	}
	defer func() {
		err := v2Account.Close()
		if err != nil {
			logger.Warn("failed to close cockroach connection: %v", err)
		}
	}()
	domain := os.Getenv("DOMAIN")
	if domain == "" {
		return fmt.Errorf("'DOMAIN' the environment variable is not set. please check")
	}
	regionUID, err := uuid.Parse(os.Getenv(cockroach.EnvLocalRegion))
	if err != nil {
		return fmt.Errorf("failed to parse region %s uid: %v", os.Getenv(cockroach.EnvLocalRegion), err)
	}
	err = retry.Retry(10, 5*time.Second, func() error {
		if !v2Account.DB.Migrator().HasTable(types.User{}) {
			return fmt.Errorf("user table is null, please check")
		}
		return nil
	})
	if err != nil {
		return fmt.Errorf("failed to check user table: %v", err)
	}
	if err = v2Account.CreateRegion(&types.Region{
		UID:         regionUID,
		Domain:      domain,
		DisplayName: domain,
		Location:    domain,
	}); err != nil {
		return fmt.Errorf("failed to create region: %v", err)
	}
	userNanoID, err := gonanoid.New(10)
	if err != nil {
		return fmt.Errorf("failed to generate nano id: %v", err)
	}
	genUserCrUID, genWorkspaceUID := uuid.New(), uuid.New()
	if err = v2Account.CreateUser(&types.OauthProvider{
		UserUID:      common.AdminUID(),
		ProviderType: types.OauthProviderTypePassword,
		ProviderID:   adminUserName,
		Password:     adminPassword,
		CreatedAt:    time.Now(),
		UpdatedAt:    time.Now(),
	}, &types.RegionUserCr{
		UID:       genUserCrUID,
		CrName:    adminUserName,
		UserUID:   common.AdminUID(),
		CreatedAt: time.Now(),
		UpdatedAt: time.Now(),
	}, &types.User{
		UID:       common.AdminUID(),
		ID:        userNanoID,
		Name:      adminUserName,
		Nickname:  userNanoID,
		CreatedAt: time.Now(),
		UpdatedAt: time.Now(),
	}, &types.Workspace{
		UID:         genWorkspaceUID,
		ID:          workspacePrefix + adminUserName,
		DisplayName: "private team",
		CreatedAt:   time.Now(),
		UpdatedAt:   time.Now(),
	}, &types.UserWorkspace{
		WorkspaceUID: genWorkspaceUID,
		UserCrUID:    genUserCrUID,
		Role:         types.RoleOwner,
		Status:       types.JoinStatusInWorkspace,
		IsPrivate:    true,
		CreatedAt:    time.Now(),
		UpdatedAt:    time.Now(),
		JoinAt:       time.Now(),
	}); err != nil {
		return fmt.Errorf("failed to create user: %v", err)
	}
	return nil
}
