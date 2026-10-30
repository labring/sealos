// Copyright © 2026 sealos.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

package applydrivers

import (
	"context"
	"errors"
	"fmt"
	"net"
	"net/url"
	"os"
	"slices"
	"time"

	"github.com/distribution/reference"
	"github.com/labring/sealos/pkg/apply/processor"
	"github.com/labring/sealos/pkg/clusterfile"
	"github.com/labring/sealos/pkg/constants"
	"github.com/labring/sealos/pkg/exec"
	"github.com/labring/sealos/pkg/ssh"
	v2 "github.com/labring/sealos/pkg/types/v1beta1"
	"github.com/labring/sealos/pkg/utils/iputils"
	"github.com/labring/sealos/pkg/utils/logger"
	"github.com/labring/sealos/pkg/utils/yaml"
	"golang.org/x/sync/errgroup"
	"k8s.io/client-go/kubernetes"
	"k8s.io/client-go/rest"
	"k8s.io/client-go/tools/clientcmd"
)

// standaloneInitialized reports whether the request targets an existing
// cluster rather than a day-zero installation.
func (c *Applier) standaloneInitialized() bool {
	return c.ClusterCurrent != nil && !c.ClusterCurrent.CreationTimestamp.IsZero()
}

// standaloneHostDiff compares the inventories exactly like the mainline
// reconciler; the diff decides which guarantees an operation needs.
func standaloneHostDiff(current, desired *v2.Cluster) (mj, md, nj, nd []string) {
	mj, md = iputils.GetDiffHosts(
		current.GetMasterIPAndPortList(),
		desired.GetMasterIPAndPortList(),
	)
	nj, nd = iputils.GetDiffHosts(
		current.GetNodeIPAndPortList(),
		desired.GetNodeIPAndPortList(),
	)
	return mj, md, nj, nd
}

// standaloneMembership reports whether the request changes the cluster
// membership. Everything else follows plain-mode semantics unchanged.
func (c *Applier) standaloneMembership() bool {
	if !c.standaloneInitialized() {
		return false
	}
	mj, md, nj, nd := standaloneHostDiff(c.ClusterCurrent, c.ClusterDesired)
	return len(mj)+len(md)+len(nj)+len(nd) != 0
}

// validateStandaloneRequest keeps the guards that protect the standalone
// inventory before any mutation starts.
func (c *Applier) validateStandaloneRequest() error {
	if c.standaloneInitialized() && !c.ClusterCurrent.IsStandaloneControlPlane() {
		return errors.New("use sealos switch control-plane standalone to enter standalone mode")
	}
	// A request that cannot possibly succeed must fail before any state is
	// recorded: an invalid image reference never converges by re-running.
	if err := validateImageReferences(c.RunNewImages); err != nil {
		return err
	}
	if !c.standaloneInitialized() {
		return nil
	}
	mj, md, nj, nd := standaloneHostDiff(c.ClusterCurrent, c.ClusterDesired)
	if len(mj)+len(nj) != 0 && len(md)+len(nd) != 0 {
		return errors.New(
			"standalone addition and removal must be submitted as separate lifecycle operations",
		)
	}
	if slices.Contains(md, c.ClusterCurrent.GetMaster0IPAndPort()) {
		return errors.New(
			"master0 machine cannot be deleted; the existing sealos inventory and registry restriction also applies in standalone mode",
		)
	}
	return nil
}

// withStandaloneLease serializes membership operations from other inventories
// through the short maintenance lease while the coordination API is alive.
func (c *Applier) withStandaloneLease(run func() error) func() error {
	return func() error {
		config, err := standaloneLifecycleConfig(c.ClusterCurrent, c.ClusterDesired)
		if err != nil {
			return err
		}
		client, err := kubernetes.NewForConfig(config)
		if err != nil {
			return err
		}
		return clusterfile.WithModeLease(c.Context, client, func(ctx context.Context) error {
			// A conversion interrupted on another inventory is recorded on
			// the API and must be resumed before membership changes.
			if err := clusterfile.CheckPendingModeTransition(ctx, client); err != nil {
				return err
			}
			previous := c.Context
			c.Context = ctx
			defer func() { c.Context = previous }()
			return run()
		})
	}
}

// runStandaloneMembership executes a membership change with the record layout
// the recover model needs: the desired inventory is staged to every
// control-plane host before any mutation, while the local Clusterfile keeps
// the previous state until the reconcile has finished, so an interrupted
// command retries exactly like a plain-mode one.
func (c *Applier) runStandaloneMembership() error {
	// The scale path constructs the applier with a lazy Clusterfile; loading
	// it here keeps the staged record and the write-back complete.
	if err := c.ClusterFile.Process(); err != nil {
		return err
	}
	path := constants.Clusterfile(c.ClusterDesired.Name)
	saved, err := os.ReadFile(path)
	if err != nil {
		return err
	}
	desired, err := yaml.MarshalConfigs(c.getWriteBackObjects()...)
	if err != nil {
		return err
	}
	restore := func() {
		if err := c.replicateInventoryFile(saved); err != nil {
			logger.Error("failed to restore the inventory record: %v", err)
		}
	}
	if err := c.replicateInventoryFile(desired); err != nil {
		return err
	}
	// Keep the previous inventory locally while reconciling: the scale
	// processors reload it, and a retry after an interruption must still see
	// the hosts it has to join or delete.
	if err := clusterfile.WriteMaintenanceFile(path, saved); err != nil {
		restore()
		return err
	}
	err = c.applyDesired()
	if err != nil {
		var checkError *processor.CheckError
		var preProcessError *processor.PreProcessError
		if errors.As(err, &checkError) || errors.As(err, &preProcessError) {
			// Nothing was mutated: withdraw the staged record as well, so a
			// recovery started from another control-plane host does not adopt
			// hosts that never joined.
			restore()
		}
	}
	return err
}

// replicateInventoryFile stages data as the local Clusterfile and copies the
// file to every control-plane host; the caller decides which state stays
// local afterwards.
func (c *Applier) replicateInventoryFile(data []byte) error {
	if err := c.Err(); err != nil {
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
	copyExecer := ssh.WithContext(ctx, execer)
	for _, host := range c.ClusterDesired.GetMasterIPAndPortList() {
		group.Go(func() error {
			if err := ctx.Err(); err != nil {
				return err
			}
			return copyExecer.Copy(host, path, path)
		})
	}
	if err := group.Wait(); err != nil {
		return fmt.Errorf(
			"inventory synchronization failed; repeat the lifecycle command: %w",
			err,
		)
	}
	return nil
}

// standaloneLifecycleConfig returns an admin client configuration pinned to a
// control-plane host present in both inventories; the survivor requirement
// itself guards conversions against inventories that disagree.
func standaloneLifecycleConfig(current, desired *v2.Cluster) (*rest.Config, error) {
	config, err := clientcmd.BuildConfigFromFlags(
		"",
		constants.NewPathResolver(desired.Name).AdminFile(),
	)
	if err != nil {
		return nil, err
	}
	endpoint, err := url.Parse(config.Host)
	if err != nil {
		return nil, err
	}
	port := endpoint.Port()
	if port == "" {
		port = "6443"
	}
	currentMasters := make(map[string]bool)
	for _, host := range current.GetMasterIPList() {
		currentMasters[host] = true
	}
	var survivor string
	for _, host := range desired.GetMasterIPList() {
		if currentMasters[host] {
			survivor = host
			break
		}
	}
	if survivor == "" {
		return nil, errors.New(
			"standalone lifecycle requires an existing control plane in the desired inventory",
		)
	}
	endpoint.Host = net.JoinHostPort(survivor, port)
	config.Host = endpoint.String()
	config.Timeout = 10 * time.Second
	return config, nil
}

// syncStandaloneInventory replicates the inventory to every control-plane
// host so any of them can drive recovery by re-running the lifecycle command;
// it replaces the recovery journal. Strict callers abort on unreachable
// hosts; reset proceeds with the hosts it can reach.
func (c *Applier) syncStandaloneInventory(strict bool) error {
	if err := c.Err(); err != nil {
		return err
	}
	data, err := yaml.MarshalConfigs(c.getWriteBackObjects()...)
	if err != nil {
		return err
	}
	if err := clusterfile.WriteMaintenanceFile(
		constants.Clusterfile(c.ClusterDesired.Name),
		data,
	); err != nil {
		return err
	}
	execer, err := exec.New(ssh.NewCacheClientFromCluster(c.ClusterDesired, true))
	if err != nil {
		return err
	}
	group, ctx := errgroup.WithContext(c.Context)
	copyExecer := ssh.WithContext(ctx, execer)
	for _, host := range c.ClusterDesired.GetMasterIPAndPortList() {
		group.Go(func() error {
			if err := ctx.Err(); err != nil {
				return err
			}
			return copyExecer.Copy(
				host,
				constants.ClusterDir(c.ClusterDesired.Name),
				constants.ClusterDir(c.ClusterDesired.Name),
			)
		})
	}
	if err := group.Wait(); err != nil {
		if strict {
			return fmt.Errorf(
				"inventory synchronization failed; repeat the lifecycle command: %w",
				err,
			)
		}
		logger.Warn("inventory replication skipped unreachable hosts: %v", err)
	}
	return nil
}

// Necessarily failing requests must never be recorded as recoverable state.
func validateImageReferences(images []string) error {
	for _, image := range images {
		if _, err := reference.ParseAnyReference(image); err != nil {
			return fmt.Errorf("invalid image reference %q: %w", image, err)
		}
	}
	return nil
}
