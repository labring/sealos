package gateway

import (
	"errors"
	"fmt"
	"net/url"
	"strings"
)

// UsernameParser parses username in format: username@short_user_namespace-devboxname
type UsernameParser struct{}

// Parse parses the username format
// Format: username@short_user_namespace-devboxname
// Examples:
//   - ubuntu@someteam-workspace
func (p *UsernameParser) Parse(input string) (username, namespace, devboxname string, err error) {
	// URL decode (handle %2E, %2D, etc.)
	decoded, err := url.QueryUnescape(input)
	if err == nil {
		input = decoded
	}

	// Cut at the first dot (separates username from target)
	username, target, found := strings.Cut(input, "@")
	if !found {
		return "", "", "", fmt.Errorf(
			"invalid format: expected username@namespace-devboxname, got: %s",
			input,
		)
	}

	if username == "" {
		return "", "", "", errors.New("username cannot be empty")
	}

	// Cut at the dash (separates namespace from devboxname)
	namespace, devboxname, found = strings.Cut(target, "-")
	if !found {
		return "", "", "", fmt.Errorf(
			"invalid format: expected namespace-devboxname, got: %s",
			target,
		)
	}

	if namespace == "" {
		return "", "", "", errors.New("namespace cannot be empty")
	}

	if devboxname == "" {
		return "", "", "", errors.New("devboxname cannot be empty")
	}

	return username, "ns-" + namespace, devboxname, nil
}

// Format formats username, namespace, and devboxname into the standard format
func (p *UsernameParser) Format(username, namespace, devboxname string) string {
	return fmt.Sprintf("%s.%s-%s", username, namespace, devboxname)
}

// Validate validates the username format
func (p *UsernameParser) Validate(input string) error {
	_, _, _, err := p.Parse(input)
	return err
}
