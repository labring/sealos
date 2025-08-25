package main

import (
	"log"

	"github.com/labring/sealos/service/exceptionmonitor/helper/notification"

	"github.com/labring/sealos/service/exceptionmonitor/api"
	"github.com/labring/sealos/service/exceptionmonitor/dao"
	"github.com/labring/sealos/service/exceptionmonitor/helper/client"
	"github.com/labring/sealos/service/exceptionmonitor/helper/monitor"
)

func main() {
	if err := initialize(); err != nil {
		log.Printf("Initialization failed: %v", err)
	}
	go monitor.DatabaseExceptionMonitor()
	go monitor.DatabasePerformanceMonitor()
	go monitor.DatabaseBackupMonitor()
	go monitor.QuotaMonitor()
	go monitor.CockroachMonitor()
	select {}
}

func initialize() error {
	if err := api.GetENV(); err != nil {
		return err
	}
	if err := client.InitClient(); err != nil {
		return err
	}
	notification.InitFeishuClient()
	return dao.InitCockroachDB()
}
