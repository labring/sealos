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

	"github.com/labring/sealos/controllers/job/init/internal/util/common"

	"github.com/labring/sealos/controllers/pkg/database"
	"github.com/labring/sealos/controllers/pkg/utils/logger"
	gonanoid "github.com/matoous/go-nanoid/v2"

	"github.com/labring/sealos/controllers/pkg/database/cockroach"
	"github.com/labring/sealos/controllers/pkg/types"
)

func PresetAdminUser() error {
	var ck cockroach.Cockroach
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
	userNanoID, err := gonanoid.New(10)
	if err != nil {
		return fmt.Errorf("failed to generate nano id: %v", err)
	}
	if err = ck.CreateUser(&types.OauthProvider{
		UserUID:      common.AdminUID(),
		ProviderType: types.OauthProviderTypePassword,
		ProviderID:   adminPassword,
	}, &types.RegionUserCr{
		CrName:  adminUserName,
		UserUID: common.AdminUID(),
	}, &types.User{
		UID:      common.AdminUID(),
		ID:       userNanoID,
		Name:     adminUserName,
		Nickname: userNanoID,
	}); err != nil {
		return fmt.Errorf("failed to create user: %v", err)
	}
	return nil
}
