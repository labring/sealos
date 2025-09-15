package auth

import (
	"context"
)

type Authenticator interface {
	Authenticate(ctx context.Context, namespace, kc string) (string, error)
}
