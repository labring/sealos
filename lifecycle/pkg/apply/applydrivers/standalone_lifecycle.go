// Copyright 2026 sealos.
// SPDX-License-Identifier: Apache-2.0

package applydrivers

import (
	"context"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"net"
	"net/url"
	"path/filepath"
	"slices"
	"sort"
	"strings"

	"github.com/labring/sealos/pkg/clusterfile"
	"github.com/labring/sealos/pkg/constants"
	"github.com/labring/sealos/pkg/exec"
	"github.com/labring/sealos/pkg/ssh"
	v2 "github.com/labring/sealos/pkg/types/v1beta1"
	"github.com/labring/sealos/pkg/utils/iputils"
	"github.com/labring/sealos/pkg/utils/yaml"
	"golang.org/x/sync/errgroup"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/client-go/tools/clientcmd"
)

func (c *Applier) withStandaloneOperation(action string, run func() error) error {
	initialized := c.ClusterCurrent != nil && !c.ClusterCurrent.CreationTimestamp.IsZero()
	if initialized && !c.ClusterCurrent.IsStandaloneControlPlane() {
		return errors.New("use sealos switch to enter standalone mode")
	}
	if initialized && action == "apply" {
		mj, md := iputils.GetDiffHosts(
			c.ClusterCurrent.GetMasterIPAndPortList(),
			c.ClusterDesired.GetMasterIPAndPortList(),
		)
		nj, nd := iputils.GetDiffHosts(
			c.ClusterCurrent.GetNodeIPAndPortList(),
			c.ClusterDesired.GetNodeIPAndPortList(),
		)
		if len(mj)+len(nj) != 0 && len(md)+len(nd) != 0 {
			return errors.New(
				"standalone addition and removal must be submitted as separate lifecycle operations",
			)
		}
		if slices.Contains(md, c.ClusterCurrent.GetMaster0IPAndPort()) {
			return errors.New(
				"master0 machine cannot be deleted; the existing Sealos inventory and registry restriction also applies in standalone mode",
			)
		}
	}
	// Only a digest leaves the inventory. SSH passwords and environment values
	// must never be embedded in the API recovery journal.
	spec := c.ClusterDesired.Spec.DeepCopy()
	spec.SSH = v2.SSH{}
	for index := range spec.Hosts {
		spec.Hosts[index].SSH = nil
	}
	request, err := json.Marshal(struct {
		Spec   any      `json:"Spec"`
		Images []string `json:"Images"`
	}{spec, c.RunNewImages})
	if err != nil {
		return err
	}
	digest := sha256.Sum256(request)
	operation := clusterfile.LifecycleOperation{
		Action:  action,
		Request: hex.EncodeToString(digest[:]),
	}
	recovery := standaloneRecoveryCluster(c.ClusterCurrent, c.ClusterDesired)
	for _, host := range recovery.GetAllIPS() {
		operation.Hosts = append(operation.Hosts, iputils.GetHostIP(host))
	}
	sort.Strings(operation.Hosts)
	objects := []any{recovery}
	if config := c.ClusterFile.GetRuntimeConfig(); config != nil {
		objects = append(objects, config.GetComponents()...)
	}
	for _, config := range c.ClusterFile.GetConfigs() {
		objects = append(objects, config)
	}
	operation.RecoveryInventory, err = yaml.MarshalConfigs(objects...)
	if err != nil {
		return err
	}
	if initialized && action == "apply" {
		config, err := clientcmd.BuildConfigFromFlags(
			"",
			constants.NewPathResolver(c.ClusterDesired.Name).AdminFile(),
		)
		if err != nil {
			return err
		}
		endpoint, err := url.Parse(config.Host)
		if err != nil {
			return err
		}
		port := endpoint.Port()
		if port == "" {
			port = "6443"
		}
		currentMasters := make(map[string]bool)
		for _, host := range c.ClusterCurrent.GetMasterIPList() {
			currentMasters[host] = true
		}
		var survivor string
		for _, host := range c.ClusterDesired.GetMasterIPList() {
			if currentMasters[host] {
				survivor = host
				break
			}
		}
		if survivor == "" {
			return errors.New(
				"standalone lifecycle requires an existing control plane in the desired inventory",
			)
		}
		endpoint.Host = net.JoinHostPort(survivor, port)
		operation.APIServer = endpoint.String()
	}
	return clusterfile.WithLifecycle(
		c.Context,
		c.ClusterDesired.Name,
		operation,
		initialized,
		func(ctx context.Context) error {
			previous := c.Context
			c.Context = ctx
			defer func() { c.Context = previous }()
			return run()
		},
	)
}

func standaloneRecoveryCluster(current, desired *v2.Cluster) *v2.Cluster {
	recovery := desired.DeepCopy()
	if current == nil {
		return recovery
	}
	present := make(map[string]bool)
	for _, host := range desired.GetAllIPS() {
		present[iputils.GetHostIP(host)] = true
	}
	for _, host := range current.Spec.Hosts {
		missing := host.DeepCopy()
		missing.IPS = nil
		for _, address := range host.IPS {
			if !present[iputils.GetHostIP(address)] {
				missing.IPS = append(missing.IPS, address)
			}
		}
		if len(missing.IPS) != 0 {
			recovery.Spec.Hosts = append(recovery.Spec.Hosts, *missing)
		}
	}
	return recovery
}

func (c *Applier) commitStandaloneInventory() error {
	localAddresses, err := net.InterfaceAddrs()
	if err != nil {
		return err
	}
	data, err := yaml.MarshalConfigs(c.getWriteBackObjects()...)
	if err != nil {
		return err
	}
	path := constants.Clusterfile(c.ClusterDesired.Name)
	if err := clusterfile.WriteMaintenanceFile(path, data); err != nil {
		return err
	}
	execer, err := exec.New(ssh.NewCacheClientFromCluster(c.ClusterDesired, true))
	if err != nil {
		return err
	}
	group, ctx := errgroup.WithContext(c.Context)
	for _, host := range c.ClusterDesired.GetMasterIPAndPortList() {
		group.Go(func() error {
			if err := ctx.Err(); err != nil {
				return err
			}
			return execer.Copy(
				host,
				constants.ClusterDir(c.ClusterDesired.Name),
				constants.ClusterDir(c.ClusterDesired.Name),
			)
		})
	}
	if err := group.Wait(); err != nil {
		return fmt.Errorf(
			"inventory synchronization is incomplete; repeat the lifecycle command: %w",
			err,
		)
	}
	// Remove remote copies after synchronization. WithLifecycle owns the local
	// recovery marker and removes it only after the API journal is committed.
	marker := filepath.Join(
		constants.ClusterDir(c.ClusterDesired.Name),
		clusterfile.LifecycleFilename,
	)
	for _, host := range c.ClusterDesired.GetMasterIPAndPortList() {
		if isLocalLifecycleHost(host, localAddresses) {
			continue
		}
		if err := execer.CmdAsync(host, "rm -f -- "+quoteLifecyclePath(marker)); err != nil {
			return err
		}
	}
	return nil
}

func isLocalLifecycleHost(host string, addresses []net.Addr) bool {
	if address, _, err := net.SplitHostPort(host); err == nil {
		host = address
	}
	if host == "localhost" {
		return true
	}
	ip := net.ParseIP(host)
	if ip.IsLoopback() {
		return true
	}
	for _, address := range addresses {
		localIP, _, err := net.ParseCIDR(address.String())
		if err == nil && localIP.Equal(ip) {
			return true
		}
	}
	return false
}

func quoteLifecyclePath(value string) string {
	// Paths derive from the validated cluster name but still require shell quoting.
	var result strings.Builder
	result.WriteString("'")
	for _, character := range value {
		if character == '\'' {
			result.WriteString("'\"'\"'")
		} else {
			result.WriteRune(character)
		}
	}
	return result.String() + "'"
}

func (c *Applier) deleteStandalone() (err error) {
	previous := c.ClusterDesired.DeletionTimestamp
	now := metav1.Now()
	c.ClusterDesired.DeletionTimestamp = &now
	defer func() {
		if err != nil {
			c.ClusterDesired.DeletionTimestamp = previous
		}
	}()
	if err := c.deleteCluster(); err != nil {
		return err
	}
	data, err := yaml.MarshalConfigs(c.getWriteBackObjects()...)
	if err != nil {
		return err
	}
	path := constants.Clusterfile(c.ClusterDesired.Name)
	if err := clusterfile.WriteMaintenanceFile(path+".reset", data); err != nil {
		return err
	}
	return nil
}
