package monitor

import (
	"database/sql"
	"fmt"
	"github.com/labring/sealos/service/exceptionmonitor/api"
	"github.com/labring/sealos/service/exceptionmonitor/helper/notification"
	"time"
)

func CockroachMonitor() {
	for {
		notificationInfo := &notification.Info{
			FeishuWebHook: api.FeishuWebhookURLMap["FeishuWebhookURLCockroachDB"],
		}
		message := ""
		if err := checkCockroachDB(api.GlobalCockroachURI); err != nil {
			message = notification.GetCockroachMessage(err.Error(), "Global")
		}
		if err := checkCockroachDB(api.LocalCockroachURI); err != nil {
			message = notification.GetCockroachMessage(err.Error(), "Local")
		}
		_ = notification.SendFeishuNotification(notificationInfo, message)
		time.Sleep(5 * time.Minute)
	}
}

func checkCockroachDB(CockroachConnection string) error {
	db, err := sql.Open("postgres", CockroachConnection)
	if err != nil {
		return fmt.Errorf("Unable to open Cockroach connection: %v", err)
	}
	defer db.Close()

	if err := db.Ping(); err != nil {
		return fmt.Errorf("Unable to Connect Cockroach: %v", err)
	}

	return nil
}
