/*
Copyright 2022 labring/sealos.

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
*/

package controllers

import (
	"context"
	"fmt"
	"time"

	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"

	infracommon "github.com/labring/sealos/controllers/infra/common"

	"github.com/labring/sealos/pkg/ssh"

	"sigs.k8s.io/yaml"

	"github.com/labring/sealos/pkg/types/v1beta1"

	"k8s.io/kubernetes/pkg/apis/core"

	"k8s.io/client-go/tools/record"

	v1 "github.com/labring/sealos/controllers/cluster/api/v1"
	infrav1 "github.com/labring/sealos/controllers/infra/api/v1"
	"github.com/labring/sealos/controllers/infra/drivers"
	"k8s.io/apimachinery/pkg/runtime"
	ctrl "sigs.k8s.io/controller-runtime"
	"sigs.k8s.io/controller-runtime/pkg/client"
)

const (
	defaultUser          = "root"
	defaultSealosVersion = "4.1.4-rc1"
)
const (
	applyClusterfileCmd = "sealos apply -f /root/Clusterfile"
	downloadSealosCmd   = `sealos version || wget  https://ghproxy.com/https://github.com/labring/sealos/releases/download/v%s/sealos_%s_linux_amd64.tar.gz  && tar -zxvf sealos_%s_linux_amd64.tar.gz sealos &&  chmod +x sealos && mv sealos /usr/bin`
)

// ClusterReconciler reconciles a Cluster object
type ClusterReconciler struct {
	client.Client
	driver   drivers.Driver
	Scheme   *runtime.Scheme
	recorder record.EventRecorder
}

//+kubebuilder:rbac:groups=cluster.sealos.io,resources=clusters,verbs=get;list;watch;create;update;patch;delete
//+kubebuilder:rbac:groups=cluster.sealos.io,resources=clusters/status,verbs=get;update;patch
//+kubebuilder:rbac:groups=cluster.sealos.io,resources=clusters/finalizers,verbs=update
//+kubebuilder:rbac:groups=infra.sealos.io,resources=infras,verbs=get;list;watch;create;update;patch;delete

// Reconcile is part of the main kubernetes reconciliation loop which aims to
// move the current state of the cluster closer to the desired state.
// TODO(user): Modify the Reconcile function to compare the state specified by
// the Cluster object against the actual cluster state, and then
// perform operations to make the cluster state reflect the state specified by
// the user.
//
// For more details, check Reconcile and its Result here:
// - https://pkg.go.dev/sigs.k8s.io/controller-runtime@v0.12.2/pkg/reconcile
func (r *ClusterReconciler) Reconcile(ctx context.Context, req ctrl.Request) (ctrl.Result, error) {
	cluster := &v1.Cluster{}
	if err := r.Get(ctx, req.NamespacedName, cluster); err != nil {
		r.recorder.Event(cluster, core.EventTypeWarning, "GetCluster", err.Error())
		return ctrl.Result{}, client.IgnoreNotFound(err)
	}

	infra := &infrav1.Infra{}
	infra.Name = cluster.Spec.Infra
	infra.Namespace = cluster.Namespace
	key := client.ObjectKey{Namespace: infra.Namespace, Name: infra.Name}
	if err := r.Get(ctx, key, infra); err != nil {
		r.recorder.Event(cluster, core.EventTypeWarning, "GetInfra", err.Error())
		return ctrl.Result{RequeueAfter: time.Second * 30}, nil
	}

	if infra.Status.Status != infrav1.Running.String() {
		return ctrl.Result{RequeueAfter: time.Second * 5}, nil
	}

	clusterfile, err := generateClusterfile(infra, cluster)
	if err != nil {
		r.recorder.Event(cluster, core.EventTypeWarning, "GenerateClusterfile", err.Error())
		return ctrl.Result{Requeue: true, RequeueAfter: time.Second * 60}, err
	}
	if err := applyClusterfile(infra, clusterfile, getSealosVersion(cluster)); err != nil {
		r.recorder.Event(cluster, core.EventTypeWarning, "ApplyClusterfile", err.Error())
		return ctrl.Result{Requeue: true, RequeueAfter: time.Second * 60}, err
	}

	// update cluster status
	cluster.Status.Status = infrav1.Running.String()
	if err := r.Status().Update(ctx, cluster); err != nil {
		r.recorder.Event(cluster, core.EventTypeWarning, "UpdateClusterStatus", err.Error())
		return ctrl.Result{}, err
	}

	return ctrl.Result{}, nil
}

// Get private ip from metadata
func getPrivateIP(meta infrav1.Metadata) string {
	for _, ip := range meta.IP {
		if ip.IPType == infracommon.IPTypePrivate {
			return ip.IPValue
		}
	}
	return ""
}

// Generate Clusterfile by infra and cluster
func generateClusterfile(infra *infrav1.Infra, cluster *v1.Cluster) (string, error) {
	new := cluster.DeepCopy()
	new.CreationTimestamp = metav1.Time{}
	new.Spec.SSH = infra.Spec.SSH
	new.Spec.SSH.User = defaultUser

	for _, host := range infra.Spec.Hosts {
		for _, meta := range host.Metadata {
			privateIP := getPrivateIP(meta)
			if privateIP == "" {
				continue
			}

			new.Spec.Hosts = append(new.Spec.Hosts, v1beta1.Host{
				IPS:   []string{privateIP},
				Roles: host.Roles,
			})
		}
	}

	// convert cluster to yaml
	clusterfile, err := yaml.Marshal(new)
	if err != nil {
		return "", fmt.Errorf("marshal cluster [%s] to yaml failed: %v", new.Name, err)
	}

	return string(clusterfile), nil
}

// Get master0 public ip from infra
func getMaster0PublicIP(infra *infrav1.Infra) string {
	for _, host := range infra.Spec.Hosts {
		for _, meta := range host.Metadata {
			for _, ip := range meta.IP {
				if ip.IPType == infracommon.IPTypePublic && host.Roles[0] == v1beta1.MASTER {
					return ip.IPValue
				}
			}
		}
	}
	return ""
}

// get sealos version from cluster
func getSealosVersion(cluster *v1.Cluster) string {
	if v, ok := cluster.Annotations["sealos.io/sealos/version"]; ok && v != "" {
		return v
	}
	return defaultSealosVersion
}

// Apply clusterfile on infra
func applyClusterfile(infra *infrav1.Infra, clusterfile, sealosVersion string) error {
	s := &v1beta1.SSH{
		User:   infra.Spec.SSH.User,
		PkData: infra.Spec.SSH.PkData,
	}
	c := ssh.NewSSHClient(s, true)
	EIP := getMaster0PublicIP(infra)
	if EIP == "" {
		return fmt.Errorf("get master0 public ip failed")
	}

	if err := ssh.WaitSSHReady(c, 5, EIP); err != nil {
		return fmt.Errorf("wait ssh ready failed: %v", err)
	}

	createClusterfile := fmt.Sprintf(`tee /root/Clusterfile <<EOF
%s
EOF`, clusterfile)
	downloadSealos := fmt.Sprintf(downloadSealosCmd, sealosVersion, sealosVersion, sealosVersion)

	cmds := []string{createClusterfile, downloadSealos, applyClusterfileCmd}
	if err := c.CmdAsync(EIP, cmds...); err != nil {
		return fmt.Errorf("write clusterfile to remote failed: %v", err)
	}

	return nil
}

// SetupWithManager sets up the controller with the Manager.
func (r *ClusterReconciler) SetupWithManager(mgr ctrl.Manager) error {
	driver, err := drivers.NewDriver()
	if err != nil {
		return fmt.Errorf("cluster controller new driver failed: %v", err)
	}
	r.driver = driver
	r.recorder = mgr.GetEventRecorderFor("sealos-cluster-controller")

	return ctrl.NewControllerManagedBy(mgr).
		For(&v1.Cluster{}).
		Complete(r)
}
