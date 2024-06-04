package exceptionMonitor

import (
	"exceptionMonitor/api"
	"exceptionMonitor/dao"
	"exceptionMonitor/helper/client"
	"exceptionMonitor/helper/monitor"
	"fmt"
	"time"
)

func main() {

	if err := api.GetENV(); err != nil {
		fmt.Printf("Failed to get env: %v", err)
	}

	if err := client.InitClient(); err != nil {
		fmt.Printf("Failed to initialize k8S client: %v", err)
	}

	if err := dao.InitCockroachDB(); err != nil {
		fmt.Printf("Failed to initialize cockroachDB: %v", err)
	}

	for {
		// execute command every 5 minutes
		if api.MonitorType != "all" {
			for _, ns := range api.ClusterNS {
				monitor.CheckDatabases(ns)
			}
		} else {
			monitor.CheckDatabases("")
		}
		time.Sleep(5 * time.Minute)
	}
}
