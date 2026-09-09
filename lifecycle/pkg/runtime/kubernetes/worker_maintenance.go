// Copyright 2026 sealos.
// SPDX-License-Identifier: Apache-2.0

package kubernetes

import (
	"context"
	"errors"
	"fmt"

	"github.com/labring/sealos/pkg/utils/iputils"
	v1 "k8s.io/api/core/v1"
	apierrors "k8s.io/apimachinery/pkg/api/errors"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
)

func (k *KubeadmRuntime) deleteWorker(host string) error {
	client, err := k.getKubeInterface()
	if err != nil {
		return err
	}
	ctx := context.Background()
	nodes, err := client.Kubernetes().CoreV1().Nodes().List(ctx, metav1.ListOptions{})
	if err != nil {
		return err
	}
	var node *v1.Node
	for index := range nodes.Items {
		candidate := &nodes.Items[index]
		for _, address := range candidate.Status.Addresses {
			if address.Type == v1.NodeInternalIP && address.Address == iputils.GetHostIP(host) {
				if node != nil && node.UID != candidate.UID {
					return errors.New("multiple Nodes have the requested worker IP")
				}
				node = candidate
			}
		}
	}
	// Stop and clean kubelet first so it cannot re-register after Node deletion.
	// An already absent Node is a valid retry; an identity replacement is not.
	if node != nil {
		if err := k.validateWorkerIdentity(host, node); err != nil {
			return err
		}
	}
	if err := k.resetWorker(host); err != nil {
		return err
	}
	if node == nil {
		return nil
	}
	err = client.Kubernetes().CoreV1().Nodes().Delete(ctx, node.Name, metav1.DeleteOptions{
		Preconditions: &metav1.Preconditions{UID: &node.UID},
	})
	if apierrors.IsNotFound(err) {
		return nil
	}
	return err
}

func (k *KubeadmRuntime) pendingWorkerJoins(hosts []string) ([]string, error) {
	client, err := k.getKubeInterface()
	if err != nil {
		return nil, err
	}
	nodes, err := client.Kubernetes().
		CoreV1().
		Nodes().
		List(context.Background(), metav1.ListOptions{})
	if err != nil {
		return nil, err
	}
	var pending []string
	for _, host := range hosts {
		var existing *v1.Node
		for index := range nodes.Items {
			node := &nodes.Items[index]
			for _, address := range node.Status.Addresses {
				if address.Type == v1.NodeInternalIP && address.Address == iputils.GetHostIP(host) {
					if existing != nil && existing.UID != node.UID {
						return nil, fmt.Errorf(
							"multiple Nodes use worker IP %s",
							iputils.GetHostIP(host),
						)
					}
					existing = node
				}
			}
		}
		if existing == nil {
			pending = append(pending, host)
			continue
		}
		if err := k.validateWorkerIdentity(host, existing); err != nil {
			return nil, err
		}
		ready := false
		for _, condition := range existing.Status.Conditions {
			if condition.Type == v1.NodeReady && condition.Status == v1.ConditionTrue {
				ready = true
			}
		}
		if !ready {
			return nil, fmt.Errorf(
				"worker %s already joined but is not Ready; repair or wait for it before retrying",
				existing.Name,
			)
		}
	}
	return pending, nil
}

func (k *KubeadmRuntime) validateWorkerIdentity(host string, node *v1.Node) error {
	for _, label := range []string{"node-role.kubernetes.io/control-plane", "node-role.kubernetes.io/master"} {
		if _, master := node.Labels[label]; master {
			return fmt.Errorf("cannot manage control-plane Node %s as a worker", node.Name)
		}
	}
	name, err := k.execHostname(host)
	if err != nil {
		return err
	}
	if name != node.Name {
		return fmt.Errorf("worker IP belongs to Node %s, but the host reports %s", node.Name, name)
	}
	return nil
}

func (k *KubeadmRuntime) resetWorker(host string) error {
	if err := k.sshCmdAsync(
		host,
		"if systemctl cat kubelet >/dev/null 2>&1; then systemctl stop kubelet; else test ! -e /etc/kubernetes/kubelet.conf && test ! -e /etc/kubernetes/bootstrap-kubelet.conf; fi",
	); err != nil {
		return err
	}
	if err := k.sshCmdAsync(
		host,
		fmt.Sprintf(remoteCleanMasterOrNode, vlogToStr(k.klogLevel), k.getEtcdDataDir()),
	); err != nil {
		return err
	}
	if err := k.execIPVSClean(host); err != nil {
		return err
	}
	return k.sshCmdAsync(host, removeKubeConfig)
}
