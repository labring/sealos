package gateway

import (
	"github.com/labring/sealos/service/sshgate/recover"
	log "github.com/sirupsen/logrus"
)

// SafeGo runs a function in a goroutine with panic recovery.
// If the function panics, it logs the error and stack trace.
func SafeGo(logger *log.Entry, fn func()) {
	recover.Go(logger, fn)
}

// recoverWithLogger recovers from panic and logs the error.
// This is intended to be used with defer in goroutines.
func recoverWithLogger(logger *log.Entry) {
	recover.WithLogger(logger)
}

// SafeGoWithLogger runs a function in a goroutine with panic recovery using the gateway logger.
func (g *Gateway) SafeGo(fn func()) {
	SafeGo(g.logger, fn)
}
