package exceptionMonitor

import (
	"exceptionMonitor/api"
	"exceptionMonitor/dao"
	"exceptionMonitor/helper/client"
	"exceptionMonitor/helper/monitor"
	"log"
	"time"
)

func main() {

	api.ClusterName = api.GetClusterNameFromEnv()
	api.MonitorType = api.GetMonitorTypeFromEnv()
	api.ClusterNS = api.GetClusterNSFromEnv()

	if err := client.InitClient(); err != nil {
		log.Fatalf("Failed to initialize k8S client: %v", err)
	}

	if err := dao.InitCockroachDB(); err != nil {
		log.Fatalf("Failed to initialize cockroachDB: %v", err)
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
