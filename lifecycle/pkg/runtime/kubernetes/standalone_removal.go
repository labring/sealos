// Copyright 2026 sealos.
// SPDX-License-Identifier: Apache-2.0

package kubernetes

import (
	"errors"
	"net"
	"strconv"

	"github.com/labring/sealos/pkg/clusterfile"
	"github.com/labring/sealos/pkg/utils/iputils"
	"k8s.io/client-go/tools/clientcmd"
)

func (k *KubeadmRuntime) prepareStandaloneRemovalEndpoint(removing, removedWorkers []string) error {
	var survivors []string
	for _, host := range k.getMasterIPAndPortList() {
		if !containsHost(removing, host) {
			survivors = append(survivors, host)
		}
	}
	if len(survivors) == 0 {
		return errors.New("removal requires a surviving API server")
	}
	config, err := clientcmd.LoadFromFile(k.pathResolver.AdminFile())
	if err != nil {
		return err
	}
	current := config.Contexts[config.CurrentContext]
	if current == nil || config.Clusters[current.Cluster] == nil {
		return errors.New("admin kubeconfig has no current cluster")
	}
	endpoint := "https://" + net.JoinHostPort(
		iputils.GetHostIP(survivors[0]),
		strconv.Itoa(int(k.getAPIServerPort())),
	)
	config.Clusters[current.Cluster].Server = endpoint
	data, err := clientcmd.Write(*config)
	if err != nil {
		return err
	}
	if err := clusterfile.WriteMaintenanceFile(k.pathResolver.AdminFile(), data); err != nil {
		return err
	}
	// Each control plane resolves Sealos' API name locally. Workers keep the
	// virtual endpoint, whose backend set is updated before any master stops.
	for _, host := range survivors {
		if err := k.execHostsAppend(host, host, k.getAPIServerDomain()); err != nil {
			return err
		}
	}
	var workers []string
	for _, host := range k.getNodeIPAndPortList() {
		if !containsHost(removedWorkers, host) {
			workers = append(workers, host)
		}
	}
	return k.SyncNodeIPVS(survivors, workers)
}
