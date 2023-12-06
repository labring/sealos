package main

import (
	"github.com/labring/sealos/controllers/job/heartbeat/internal/cluster"
)

func main() {
	resource, err := cluster.GetClusterResources()
	if err != nil {
		return
	}

	client := resty.New()
	_, err = client.R().
		SetHeader("Content-Type", "application/json").
		SetBody(resource).
		Post("https://license.sealos.io/api/v1alpha/heartbeat/cluster")
	if err != nil {
		return
	}
}
