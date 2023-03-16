package api

type AuthRequest struct {
	Email    string `json:"email"`
	Password string `json:"password"`
	Web      bool   `json:"web"`
}

type AuthResponse struct {
	Token string `json:"token"`
}

type UserType int32

// github.com/bytebase/bytebase/proto/generated-go/v1
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
	PrincipalIDForFirstUser = 101
)

// a.k.a SignupRequest
type CreateUserRequest struct {
	Email    string   `json:"email"`
	Password string   `json:"password"`
	Type     UserType `json:"userType"`
	Name     string   `json:"name"`
	Title    string   `json:"title"`
}
