package api

import (
	"errors"

	"github.com/labring/sealos/pkg/client-go/kubernetes"
)

type Labels map[string][]string

// Authenticator Authentication plugin interface.
type Authenticator interface {
	// Authenticate Given a username and a password (plain text), responds with the result or an error.
	// Error should only be reported if request could not be serviced, not if it should be denied.
	// A special ErrNoMatch error is returned if the authorizer could not reach a decision,
	// e.g. none of the rules matched.
	// Another special ErrWrongPass error is returned if the authorizer failed to authenticate.
	// Implementations must be goroutine-safe.
	Authenticate(user string, password PasswordString) (bool, Labels, kubernetes.Client, error)

	// Stop Finalize resources in preparation for shutdown.
	// When this call is made there are guaranteed to be no Authenticate requests in flight
	// and there will be no more calls made to this instance.
	Stop()
}

var ErrNoMatch = errors.New("did not match any rule")
var ErrWrongPass = errors.New("wrong password for user")

type PasswordString string

// String Rewrite String method to prevent password leakage via print PasswordString
func (ps PasswordString) String() string {
	if len(ps) == 0 {
		return ""
	}
	return "***"
}
