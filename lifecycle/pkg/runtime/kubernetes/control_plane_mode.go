// Copyright 2026 sealos.
// SPDX-License-Identifier: Apache-2.0

package kubernetes

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"os"
	"path/filepath"
	"reflect"
	"strconv"
	"strings"
	"time"

	"github.com/labring/sealos/pkg/clusterfile"
	"github.com/labring/sealos/pkg/constants"
	"github.com/labring/sealos/pkg/runtime/kubernetes/standalone"
	"github.com/labring/sealos/pkg/utils/logger"
	v1 "k8s.io/api/core/v1"
	apierrors "k8s.io/apimachinery/pkg/api/errors"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	clientset "k8s.io/client-go/kubernetes"
)

type modeTransition struct {
	Target string   `json:"Target"`
	Hosts  []string `json:"Hosts"`
}

func (k *KubeadmRuntime) SwitchControlPlaneMode(
	ctx context.Context,
	options standalone.ModeOptions,
) error {
	if options.Mode != standalone.ModeStandalone && options.Mode != standalone.ModeRegistered {
		return errors.New("mode must be standalone or registered")
	}
	if options.Timeout <= 0 {
		return errors.New("timeout must be positive")
	}
	if options.Mode == standalone.ModeRegistered &&
		(options.RouteController != nil || options.UpdateController) {
		return errors.New("route-controller options are only valid for standalone mode")
	}
	client, err := k.getKubeInterface()
	if err != nil {
		return err
	}
	return clusterfile.WithModeLease(ctx, client.Kubernetes(), func(ctx context.Context) error {
		if err := clusterfile.CheckLifecycle(ctx, client.Kubernetes()); err != nil {
			return err
		}
		return k.switchControlPlaneMode(ctx, client.Kubernetes(), options)
	})
}

func (k *KubeadmRuntime) switchControlPlaneMode(
	ctx context.Context,
	client clientset.Interface,
	options standalone.ModeOptions,
) error {
	hosts := k.getMasterIPAndPortList()
	if len(hosts) == 0 {
		return errors.New("cluster has no control planes")
	}
	journal := modeTransition{
		Target: options.Mode,
		Hosts:  hosts,
	}
	configMaps := client.CoreV1().ConfigMaps("kube-system")
	cm, err := configMaps.Get(ctx, clusterfile.ModeTransitionResource, metav1.GetOptions{})
	switch {
	case err == nil:
		if err := json.Unmarshal([]byte(cm.Data["transition"]), &journal); err != nil {
			return err
		}
		if !reflect.DeepEqual(journal.Hosts, hosts) {
			return errors.New(
				"master inventory differs from the pending conversion; restore the original inventory before resuming",
			)
		}
	case !apierrors.IsNotFound(err):
		return err
	default:
		cm = nil
	}
	journal.Target = options.Mode
	var command strings.Builder
	command.WriteString(strings.Join([]string{
		shellArgument(k.pathResolver.RootFSSealctlPath()), "switch", shellArgument(options.Mode),
		"--timeout", shellArgument(options.Timeout.String()),
	}, " "))
	if options.Mode == standalone.ModeStandalone {
		controller := standalone.DefaultRouteControllerOptions()
		if options.RouteController != nil {
			controller = *options.RouteController
		}
		if err := controller.Validate(); err != nil {
			return err
		}
		fields := standalone.RouteControllerFlags
		if options.ControllerFields != nil {
			fields = options.ControllerFields
		}
		if options.UpdateController {
			command.WriteString(" --update-controller")
		}
		values := map[string]string{
			"route-controller-image":      controller.Image,
			"route-controller-kubeconfig": controller.Kubeconfig,
			"route-controller-config":     controller.Config,
			"route-table":                 strconv.Itoa(controller.Table),
			"route-protocol":              strconv.Itoa(controller.Protocol),
		}
		for _, field := range fields {
			value, ok := values[field]
			if !ok {
				return fmt.Errorf("unknown controller flag %q", field)
			}
			command.WriteString(" --" + field + " " + shellArgument(value))
		}
	}
	// sealctl enforces the requested host timeout. Allow it to return its
	// diagnostic before the transport expires, and cancel on lease loss.
	runConversion := func(host, command string) error {
		commandContext, cancel := context.WithTimeout(ctx, options.Timeout+30*time.Second)
		defer cancel()
		return k.execer.CmdAsyncWithContext(commandContext, host, command)
	}
	for _, host := range hosts {
		if err := ctx.Err(); err != nil {
			return err
		}
		if err := runConversion(host, command.String()+" --check-only"); err != nil {
			return fmt.Errorf("mode preflight on %s: %w", host, err)
		}
	}
	if options.CheckOnly {
		return nil
	}
	localMarker := filepath.Join(
		constants.ClusterDir(k.cluster.Name),
		clusterfile.ModeTransitionFilename,
	)
	newJournal := cm == nil
	if cm == nil {
		cm = &v1.ConfigMap{
			ObjectMeta: metav1.ObjectMeta{
				Name:      clusterfile.ModeTransitionResource,
				Namespace: "kube-system",
			},
		}
	}
	if err := ctx.Err(); err != nil {
		return err
	}
	if err := clusterfile.WriteMaintenanceJSON(localMarker, journal); err != nil {
		return err
	}
	data, err := json.Marshal(journal)
	if err != nil {
		return err
	}
	cm.Data = map[string]string{"transition": string(data)}
	if newJournal {
		cm, err = configMaps.Create(ctx, cm, metav1.CreateOptions{})
	} else {
		cm, err = configMaps.Update(ctx, cm, metav1.UpdateOptions{})
	}
	if err != nil {
		return err
	}
	// Propagate the recovery marker before any host changes mode. The API
	// journal also guards clients whose local inventory predates this operation.
	for _, host := range hosts {
		if err := k.sshCmdAsync(
			host,
			"install -d -m 700 "+shellArgument(filepath.Dir(localMarker)),
		); err != nil {
			return err
		}
		if err := k.copyModeFile(host, localMarker); err != nil {
			return err
		}
	}
	// Host baselines own progress. Every retry rechecks each host.
	for _, host := range hosts {
		if err := ctx.Err(); err != nil {
			return err
		}
		logger.Info("convert control plane %s to %s", host, options.Mode)
		if err := runConversion(host, command.String()); err != nil {
			return fmt.Errorf("mode conversion on %s paused: %w", host, err)
		}
	}
	path := constants.Clusterfile(k.cluster.Name)
	if err := clusterfile.SetControlPlaneMode(path, options.Mode); err != nil {
		return err
	}
	for _, host := range hosts {
		if err := ctx.Err(); err != nil {
			return err
		}
		if err := k.copyModeFile(host, path); err != nil {
			return err
		}
	}
	// Remove remote markers while the API journal and lease still exclude other
	// lifecycle commands, then commit the journal deletion with its UID/version.
	for _, host := range hosts {
		if err := k.sshCmdAsync(host, "rm -f -- "+shellArgument(localMarker)); err != nil {
			return err
		}
	}
	if err := configMaps.Delete(ctx, cm.Name, metav1.DeleteOptions{
		Preconditions: &metav1.Preconditions{
			UID:             &cm.UID,
			ResourceVersion: &cm.ResourceVersion,
		},
	}); err != nil {
		return err
	}
	if err := os.Remove(localMarker); err != nil && !os.IsNotExist(err) {
		return err
	}
	k.cluster.Spec.ControlPlaneMode = options.Mode
	return nil
}

func (k *KubeadmRuntime) copyModeFile(host, path string) error {
	temporary := path + ".sealos-mode-incoming"
	if err := k.sshCopy(host, path, temporary); err != nil {
		return err
	}
	return k.sshCmdAsyncSeq(host,
		"chmod 600 -- "+shellArgument(temporary),
		"mv -f -- "+shellArgument(temporary)+" "+shellArgument(path),
	)
}
