package auth

import (
	"context"
)

type Authenticator interface {
	Authenticate(ctx context.Context, namespace string, kc string) (string, error)
}
