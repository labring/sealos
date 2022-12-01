package api

import "errors"

type Labels map[string][]string

// Authenticator Authentication plugin interface.
type Authenticator interface {
	// Authenticate Given a username and a password (plain text), responds with the result or an error.
	// Error should only be reported if request could not be serviced, not if it should be denied.
	// A special NoMatch error is returned if the authorizer could not reach a decision,
	// e.g. none of the rules matched.
	// Another special WrongPass error is returned if the authorizer failed to authenticate.
	// Implementations must be goroutine-safe.
	Authenticate(user string, password PasswordString) (bool, Labels, error)

	// Stop Finalize resources in preparation for shutdown.
	// When this call is made there are guaranteed to be no Authenticate requests in flight
	// and there will be no more calls made to this instance.
	Stop()

	// Name Human-readable name of the authenticator.
	Name() string
}

var NoMatch = errors.New("did not match any rule")
var WrongPass = errors.New("wrong password for user")

type PasswordString string

func (ps PasswordString) String() string {
	if len(ps) == 0 {
		return ""
	}
	return "***"
}
