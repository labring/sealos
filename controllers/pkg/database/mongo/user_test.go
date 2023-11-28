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

package mongo

import (
	"context"
	"os"
	"testing"
)

func Test_mongoDB_GetUser(t *testing.T) {
	dbCTX := context.Background()
	m, err := NewMongoInterface(dbCTX, os.Getenv("MONGODB_URI"))
	if err != nil {
		t.Errorf("failed to connect mongo: error = %v", err)
	}
	defer func() {
		if err = m.Disconnect(dbCTX); err != nil {
			t.Errorf("failed to disconnect mongo: error = %v", err)
		}
	}()
	users, err := m.GetUser("admin")
	if err != nil {
		t.Errorf("failed to get user: error = %v", err)
	}
	t.Logf("users: %v", users)
}
