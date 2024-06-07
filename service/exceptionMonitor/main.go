package exceptionMonitor

import (
	"fmt"
	"github.com/labring/sealos/service/exceptionMonitor/api"
	"github.com/labring/sealos/service/exceptionMonitor/dao"
	"github.com/labring/sealos/service/exceptionMonitor/helper/client"
	"github.com/labring/sealos/service/exceptionMonitor/helper/monitor"
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
