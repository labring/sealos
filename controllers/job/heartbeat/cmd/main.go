package main

import (
	"github.com/labring/sealos/controllers/job/heartbeat/api/v1alpha"

	"github.com/go-resty/resty/v2"
	"github.com/labring/sealos/controllers/job/heartbeat/internal/cluster"
	"github.com/labring/sealos/controllers/pkg/utils/logger"
)

func main() {
	resource, err := cluster.GetClusterResources()
	if err != nil {
		logger.Error(err.Error())
		return
	}
	logger.Info("cluster resource: %+v", resource)

	clusterId, err := cluster.GetClusterID()
	if err != nil {
		logger.Error(err.Error())
		return
	}
	logger.Info("cluster id: %s", clusterId)

	client := resty.New()
	_, err = client.R().
		SetHeader("Content-Type", "application/json").
		SetBody(v1alpha.Request{
			ClusterID:       clusterId,
			ClusterResource: resource,
		}).
		Post("https://license.sealos.io/api/v1alpha/heartbeat/cluster")
	if err != nil {
		logger.Error(err.Error())
		return
	}
	logger.Info("heartbeat success")
}
