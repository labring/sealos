package notify

import (
	"time"

	"github.com/labring/sealos/service/aiproxy/common/trylock"
	log "github.com/sirupsen/logrus"
)

type StdNotifier struct{}

var (
	infoLogrus  = log.WithField("notify", "std")
	warnLogrus  = log.WithField("notify", "std")
	errorLogrus = log.WithField("notify", "std")
)

func (n *StdNotifier) Notify(level Level, title, message string) {
	switch level {
	case LevelInfo:
		infoLogrus.Info("title: ", title, "message: ", message)
	case LevelWarn:
		warnLogrus.Warn("title: ", title, "message: ", message)
	case LevelError:
		errorLogrus.Error("title: ", title, "message: ", message)
	}
}

func (n *StdNotifier) NotifyThrottle(level Level, key string, expiration time.Duration, title, message string) {
	if !trylock.MemLock(key, expiration) {
		return
	}
	n.Notify(level, title, message)
}
