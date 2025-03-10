package notify

import (
	"time"

	"github.com/labring/sealos/service/aiproxy/common/config"
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
	note := config.GetNotifyNote()
	switch level {
	case LevelInfo:
		logrus := infoLogrus.WithField("title", title)
		if note != "" {
			logrus = logrus.WithField("note", note)
		}
		logrus.Info(message)
	case LevelWarn:
		logrus := warnLogrus.WithField("title", title)
		if note != "" {
			logrus = logrus.WithField("note", note)
		}
		logrus.Warn(message)
	case LevelError:
		logrus := errorLogrus.WithField("title", title)
		if note != "" {
			logrus = logrus.WithField("note", note)
		}
		logrus.Error(message)
	}
}

func (n *StdNotifier) NotifyThrottle(level Level, key string, expiration time.Duration, title, message string) {
	if !trylock.MemLock(key, expiration) {
		return
	}
	n.Notify(level, title, message)
}
