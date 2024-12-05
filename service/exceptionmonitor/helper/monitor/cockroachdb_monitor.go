package monitor

import (
	"database/sql"
	"fmt"
	"time"

	"github.com/labring/sealos/service/exceptionmonitor/api"
	"github.com/labring/sealos/service/exceptionmonitor/helper/notification"
)

func CockroachMonitor() {
	for {
		notificationInfo := &api.Info{
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
		return fmt.Errorf("unable to open Cockroach connection: %w", err)
	}
	defer db.Close()

	if err := db.Ping(); err != nil {
		return fmt.Errorf("unable to connect to Cockroach: %w", err)
	}

	return nil
}
