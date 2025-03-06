package notify

import (
	log "github.com/sirupsen/logrus"
)

type MockNotifier struct{}

func (n *MockNotifier) Notify(level Level, message string) {
	switch level {
	case LevelInfo:
		log.Info(message)
	case LevelWarn:
		log.Warn(message)
	case LevelError:
		log.Error(message)
	}
}
