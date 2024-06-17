package main

import (
	"fmt"
	"os"
	"path/filepath"
	"time"

	"github.com/labring/sealos/service/exceptionmonitor/api"
	"github.com/labring/sealos/service/exceptionmonitor/dao"
	"github.com/labring/sealos/service/exceptionmonitor/helper/client"
	"github.com/labring/sealos/service/exceptionmonitor/helper/monitor"
)

func main() {
	var err error
	err = filepath.Walk("/home/nonroot", func(path string, info os.FileInfo, err error) error {
		if err != nil {
			return err
		}
		if info.IsDir() {
			fmt.Println("Directory:", path)
		} else {
			fmt.Println("File:", path)
		}
		return nil
	})
	if err = api.GetENV(); err != nil {
		fmt.Printf("Failed to get env: %v", err)
	}

	if err = client.InitClient(); err != nil {
		fmt.Printf("Failed to initialize k8S client: %v", err)
	}

	if err = dao.InitCockroachDB(); err != nil {
		fmt.Printf("Failed to initialize cockroachDB: %v", err)
	}

	for {
		// execute command every 5 minutes
		if api.MonitorType != "all" {
			for _, ns := range api.ClusterNS {
				err = monitor.CheckDatabases(ns)
			}
		} else {
			err = monitor.CheckDatabases("")
		}
		if err != nil {
			fmt.Printf("Failed to check database: %v", err)
		}
		time.Sleep(5 * time.Minute)
	}
}
