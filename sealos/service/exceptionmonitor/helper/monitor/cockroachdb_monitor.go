package monitor

import (
	"fmt"
	"log"
	"time"

	"github.com/labring/sealos/service/exceptionmonitor/api"
	"github.com/labring/sealos/service/exceptionmonitor/helper/notification"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
)

func CockroachMonitor() {
	for api.CockroachMonitor {
		notificationInfo := &api.Info{
			FeishuWebHook: api.FeishuWebhookURLMap["FeishuWebhookURLCockroachDB"],
		}
		monitorCockroachDB(api.GlobalCockroachURI, "Global", notificationInfo)
		monitorCockroachDB(api.LocalCockroachURI, "Local", notificationInfo)

		time.Sleep(5 * time.Minute)
	}
}

func monitorCockroachDB(uri, label string, notificationInfo *api.Info) {
	if err := checkCockroachDB(uri); err != nil {
		message := notification.GetCockroachMessage(err.Error(), label)
		if sendErr := notification.SendFeishuNotification(notificationInfo, message); sendErr != nil {
			log.Printf("Failed to send Feishu notification for %s: %v", label, sendErr)
		}
	}
}

func checkCockroachDB(CockroachConnection string) error {
	db, err := gorm.Open(postgres.Open(CockroachConnection), &gorm.Config{
		Logger: logger.Discard,
	})
	if err != nil {
		return fmt.Errorf("failed to connect to CockroachDB: %v", err)
	}

	sqlDB, err := db.DB()
	if err != nil {
		return fmt.Errorf("failed to get database instance: %v", err)
	}
	defer sqlDB.Close()

	if err := sqlDB.Ping(); err != nil {
		return fmt.Errorf("failed to ping CockroachDB: %v", err)
	}
	return nil
}
