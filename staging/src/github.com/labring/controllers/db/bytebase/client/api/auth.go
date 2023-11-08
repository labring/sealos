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

type AuthRequest struct {
	Email    string `json:"email"`
	Password string `json:"password"`
	Web      bool   `json:"web"`
}

type UserType int32

// https://github.com/bytebase/bytebase/blob/main/proto/generated-go/v1/auth_service.pb.go
const (
	// EndUser is the principal type for END_USER.
	// EndUser represents the human being using Bytebase.
	EndUser UserType = 1
	// ServiceAccount is the principal type for SERVICE_ACCOUNT.
	// ServiceAcount represents the external service calling Bytebase OpenAPI.
	ServiceAccount UserType = 2
	// SystemBot is the principal type for SYSTEM_BOT.
	// SystemBot represents the internal system bot performing operations.
	SystemBot UserType = 3

	// PrincipalIDForFirstUser is the principal id for the first user in workspace.
	PrincipalIDForFirstUser = "101"
)

// a.k.a SignupRequest
type CreateUserRequest struct {
	Email    string   `json:"email"`
	Password string   `json:"password"`
	Type     UserType `json:"userType"`
	Name     string   `json:"name"`
	Title    string   `json:"title"`
}

type GetUserResponse struct {
	Email      string `json:"email"`
	Password   string `json:"password"`
	Type       string `json:"userType"`
	Name       string `json:"name"`
	Title      string `json:"title"`
	State      string `json:"state"`
	ServiceKey string `json:"serviceKey"`
}

// All needed cookies after login
type LoginCookie struct {
	AccessToken  string `json:"accessToken"`
	RefreshToken string `json:"refreshToken"`
	User         string `json:"user"`
}
