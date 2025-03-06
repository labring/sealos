package notify

import (
	"time"

	"github.com/labring/sealos/service/aiproxy/common/trylock"
	log "github.com/sirupsen/logrus"
)

type MockNotifier struct{}

var (
	infoLogrus  = log.WithField("notify", "mock")
	warnLogrus  = log.WithField("notify", "mock")
	errorLogrus = log.WithField("notify", "mock")
)

func (n *MockNotifier) Notify(level Level, message string) {
	switch level {
	case LevelInfo:
		infoLogrus.Info(message)
	case LevelWarn:
		warnLogrus.Warn(message)
	case LevelError:
		errorLogrus.Error(message)
	}
}

func (n *MockNotifier) NotifyThrottle(level Level, key string, expiration time.Duration, message string) {
	if !trylock.MemLock(key, expiration) {
		return
	}
	n.Notify(level, message)
}
