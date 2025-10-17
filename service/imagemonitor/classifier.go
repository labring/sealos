package main

import (
	"log"
	"regexp"
	"strings"
)

// Predefined regular expressions for different failure reasons, used to classify error messages
var (
	reImageNotFound = regexp.MustCompile(
		`(?i)not found|NotFound|manifest unknown|repository does not exist`,
	)
	reProxyError   = regexp.MustCompile(`(?i)proxyconnect|proxy error`)
	reUnauthorized = regexp.MustCompile(
		`(?i)unauthorized|authentication require|failed to authorize|authorization failed`,
	)
	reTLS               = regexp.MustCompile(`(?i)tls handshake|failed to verify certificate`)
	reIOTimeout         = regexp.MustCompile(`(?i)i/o timeout`)
	reConnectionRefused = regexp.MustCompile(`(?i)connection refused`)
	reNetworkError      = regexp.MustCompile(`(?i)failed to do request`)
)

// isBackOffPullingImage checks if the state is back-off pulling image
func isBackOffPullingImage(reason, message string) bool {
	if strings.ToLower(reason) == "imagepullbackoff" {
		return true
	}

	if strings.Contains(strings.ToLower(message), "back-off pulling image") {
		return true
	}

	return false
}

func isImagePullFailureReason(reason string) bool {
	switch reason {
	case "ErrImagePull", "ImagePullBackOff", "Cancelled", "RegistryUnavailable":
		return true
	default:
		return false
	}
}

func isImagePullSlowReason(reason string) bool {
	switch reason {
	case "ContainerCreating":
		return true
	default:
		return false
	}
}

func classifyFailureReason(r, message string) reason {
	lowMsg := strings.ToLower(message)
	switch strings.ToLower(r) {
	case "errimagepull", "imagepullbackoff":
		if reImageNotFound.MatchString(lowMsg) {
			return ReasonImageNotFound
		}

		if reProxyError.MatchString(lowMsg) {
			return ReasonProxyError
		}

		if reUnauthorized.MatchString(lowMsg) {
			return ReasonUnauthorized
		}

		if reTLS.MatchString(lowMsg) {
			return ReasonTLSHandshake
		}

		if reIOTimeout.MatchString(lowMsg) {
			return ReasonIOTimeout
		}

		if reConnectionRefused.MatchString(lowMsg) {
			return ReasonConnectionRefused
		}

		if reNetworkError.MatchString(lowMsg) {
			return ReasonNetworkError
		}

		if strings.HasPrefix(lowMsg, "back-off pulling image") {
			return ReasonBackOff
		}

		log.Printf("[Classify] Unknown error classification reason=%s message=%s", r, message)

		return ReasonUnknown
	default:
		return strings.ToLower(r)
	}
}

// isSpecificReason determines if it's a specific failure reason (not back_off_pulling_image)
func isSpecificReason(reason string) bool {
	return reason != ReasonBackOff && reason != ReasonUnknown
}
