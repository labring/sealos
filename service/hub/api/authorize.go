package api

import (
	"fmt"
	"net"
	"strings"
)

// Authorizer interface performs authorization of the request.
// It is invoked after authentication, so it can be assumed that the requestor has
// presented satisfactory credentials for Account.
// Principally, it answers the question: is this Account allowed to perform these Actions
// on this Type.Name subject in the give Service?
type Authorizer interface {
	// Authorize performs authorization given the request information.
	// It returns a set of authorized actions (of the set requested), which can be empty/nil.
	// Error should only be reported if request could not be serviced, not if it should be denied.
	// A special ErrNoMatch error is returned if the authorizer could not reach a decision,
	// e.g. none of the rules matched.
	// Implementations must be goroutine-safe.
	Authorize(ai *AuthRequestInfo) ([]string, error)

	// Stop Finalize resources in preparation for shutdown.
	// When this call is made there are guaranteed to be no Authenticate requests in flight
	// and there will be no more calls made to this instance.
	Stop()

	// Name Human-readable name of the authenticator.
	Name() string
}

type AuthRequestInfo struct {
	Account    string
	Type       string
	Name       string
	Service    string
	IP         net.IP
	Actions    []string
	Labels     Labels
	Kubeconfig string
}

func (ai AuthRequestInfo) String() string {
	return fmt.Sprintf("{%s %s %s %s}", ai.Account, strings.Join(ai.Actions, ","), ai.Type, ai.Name)
}
