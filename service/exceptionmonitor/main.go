package main

import (
	"fmt"
	"os"
	"strings"
	"time"

	"github.com/labring/sealos/service/exceptionmonitor/api"
	"github.com/labring/sealos/service/exceptionmonitor/dao"
	"github.com/labring/sealos/service/exceptionmonitor/helper/client"
	"github.com/labring/sealos/service/exceptionmonitor/helper/monitor"
)

func main() {
	fmt.Println("111111")
	envs := os.Environ()

	// 打印所有环境变量
	fmt.Println("Environment Variables:")
	for _, env := range envs {
		// 将 "key=value" 格式的环境变量拆分为键和值
		pair := strings.SplitN(env, "=", 2)
		key := pair[0]
		value := pair[1]
		fmt.Printf("%s=%s\n", key, value)
	}

	var err error
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
