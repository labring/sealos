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
	"errors"
	"fmt"
	"path/filepath"
	"time"

	"github.com/labring/sealos/controllers/cluster/utils"

	"github.com/go-logr/logr"

	"sigs.k8s.io/controller-runtime/pkg/handler"
	"sigs.k8s.io/controller-runtime/pkg/source"

	v1 "github.com/labring/sealos/controllers/cluster/api/v1"
	infrav1 "github.com/labring/sealos/controllers/infra/api/v1"
	infracommon "github.com/labring/sealos/controllers/infra/common"
	"github.com/labring/sealos/controllers/infra/drivers"
	"github.com/labring/sealos/pkg/ssh"
	"github.com/labring/sealos/pkg/types/v1beta1"

	corev1 "k8s.io/api/core/v1"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/runtime"
	"k8s.io/client-go/tools/record"
	ctrl "sigs.k8s.io/controller-runtime"
	"sigs.k8s.io/controller-runtime/pkg/client"
	"sigs.k8s.io/yaml"
)

const (
	defaultUser            = "root"
	defaultSealosVersion   = "4.1.4"
	defaultWorkDir         = "/root/.sealos"
	defaultClusterFileName = "Clusterfile"
)
const (
	applyClusterfileCmd = "sealos apply -f /root/Clusterfile"
	downloadSealosCmd   = `sealos version || wget  https://ghproxy.com/https://github.com/labring/sealos/releases/download/v%[1]s/sealos_%[1]s_linux_amd64.tar.gz  && tar -zxvf sealos_%[1]s_linux_amd64.tar.gz sealos &&  chmod +x sealos && mv sealos /usr/bin`
	getClusterfileCmd   = "cat %s"
)

var errClusterFileNotExists = errors.New("get clusterfile on master failed").Error()

// ClusterReconciler reconciles a Cluster object
type ClusterReconciler struct {
	client.Client
	logr.Logger
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
		r.recorder.Event(cluster, corev1.EventTypeWarning, "GetCluster", err.Error())
		return ctrl.Result{}, client.IgnoreNotFound(err)
	}

	infra := &infrav1.Infra{}
	infra.Name = cluster.Spec.Infra
	infra.Namespace = cluster.Namespace
	key := client.ObjectKey{Namespace: infra.Namespace, Name: infra.Name}
	if err := r.Get(ctx, key, infra); err != nil {
		r.recorder.Event(cluster, corev1.EventTypeWarning, "GetInfra", err.Error())
		return ctrl.Result{RequeueAfter: time.Second * 30}, nil
	}

	if infra.Status.Status != infrav1.Running.String() {
		return ctrl.Result{RequeueAfter: time.Second * 5}, nil
	}

	c := getSSHclient(infra)
	ips := getAllInstanceIP(infra)
	if err := waitAllInstanceSSHReady(c, ips); err != nil {
		r.Logger.Error(err, "wait ssh ready failed")
		return ctrl.Result{RequeueAfter: time.Second * 5}, nil
	}

	EIP, err := getMaster0PublicIP(infra)
	if err != nil {
		r.Logger.Error(err, "Failed to get master0 ip")
		return ctrl.Result{RequeueAfter: time.Second * 30}, nil
	}

	currentCluster, err := getMasterClusterfile(c, cluster, EIP)
	if err != nil && err.Error() != errClusterFileNotExists {
		return ctrl.Result{Requeue: true}, nil
	}

	if err != nil && err.Error() == errClusterFileNotExists {
		newCluster := generateClusterFromInfra(infra, cluster)
		newClusterFile, err := convertClusterToYaml(newCluster)
		if err != nil {
			r.recorder.Event(cluster, corev1.EventTypeWarning, "GenerateClusterfile", "generate clusterfile failed")
			return ctrl.Result{Requeue: true, RequeueAfter: time.Second * 60}, err
		}

		if err := applyClusterfile(c, EIP, newClusterFile, getSealosVersion(cluster)); err != nil {
			r.recorder.Event(cluster, corev1.EventTypeWarning, "ApplyClusterfile", "apply clusterfile failed")
			return ctrl.Result{Requeue: true, RequeueAfter: time.Second * 60}, err
		}
	} else {
		desiredCluster := generateClusterFromInfra(infra, cluster)
		newCluster := mergeCluster(currentCluster, desiredCluster)
		newClusterFile, err := convertClusterToYaml(newCluster)
		r.Logger.Info("new clusterfile", "clusterfile: ", newClusterFile)

		if err != nil {
			r.recorder.Event(cluster, corev1.EventTypeWarning, "GenerateClusterfile", err.Error())
			return ctrl.Result{Requeue: true, RequeueAfter: time.Second * 60}, err
		}

		if err := applyClusterfile(c, EIP, newClusterFile, getSealosVersion(cluster)); err != nil {
			r.recorder.Event(cluster, corev1.EventTypeWarning, "ApplyClusterfile", err.Error())
			return ctrl.Result{Requeue: true, RequeueAfter: time.Second * 60}, err
		}
	}

	// update cluster status
	cluster.Status.Status = v1.Running.String()
	if err := r.Status().Update(ctx, cluster); err != nil {
		r.recorder.Event(cluster, corev1.EventTypeWarning, "UpdateClusterStatus", err.Error())
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
func generateClusterFromInfra(infra *infrav1.Infra, cluster *v1.Cluster) *v1.Cluster {
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
	return new
}

// merge current cluster to new cluster
func mergeCluster(currentCluster *v1beta1.Cluster, desiredCluster *v1.Cluster) *v1beta1.Cluster {
	new := currentCluster.DeepCopy()
	hosts := desiredCluster.Spec.Hosts
	new.Spec.Hosts = hosts
	return new
}

func convertClusterToYaml(cluster interface{}) (string, error) {
	// convert cluster to yaml
	newClusterfile, err := yaml.Marshal(cluster)
	if err != nil {
		return "", fmt.Errorf("marshal cluster to yaml failed: %v", err)
	}

	return string(newClusterfile), nil
}

// Get master0 public ip from infra
func getMaster0PublicIP(infra *infrav1.Infra) (string, error) {
	for _, host := range infra.Spec.Hosts {
		for _, meta := range host.Metadata {
			for _, ip := range meta.IP {
				if ip.IPType == infracommon.IPTypePublic && host.Roles[0] == v1beta1.MASTER {
					return ip.IPValue, nil
				}
			}
		}
	}
	return "", fmt.Errorf("get master0 ip failed")
}

func getAllInstanceIP(infra *infrav1.Infra) []string {
	var ips []string
	for _, host := range infra.Spec.Hosts {
		for _, meta := range host.Metadata {
			for _, ip := range meta.IP {
				if ip.IPType == infracommon.IPTypePublic {
					ips = append(ips, ip.IPValue)
				}
			}
		}
	}
	return ips
}

// get sealos version from cluster
func getSealosVersion(cluster *v1.Cluster) string {
	if v, ok := cluster.Annotations["sealos.io/sealos/version"]; ok && v != "" {
		return v
	}
	return defaultSealosVersion
}

func waitAllInstanceSSHReady(c ssh.Interface, ips []string) error {
	for _, ip := range ips {
		if err := utils.WaitSSHReady(c, 5, ip); err != nil {
			return fmt.Errorf("wait node %v ssh ready failed: %v", ip, err)
		}
	}
	return nil
}

func getSSHclient(infra *infrav1.Infra) ssh.Interface {
	s := &v1beta1.SSH{
		User:   defaultUser,
		PkData: infra.Spec.SSH.PkData,
	}
	c := ssh.NewSSHClient(s, true)

	return c
}

// Apply clusterfile on infra
func applyClusterfile(c ssh.Interface, EIP, clusterfile, sealosVersion string) error {
	createClusterfile := fmt.Sprintf(`tee /root/Clusterfile <<EOF
%s
EOF`, clusterfile)
	downloadSealos := fmt.Sprintf(downloadSealosCmd, sealosVersion)

	cmds := []string{createClusterfile, downloadSealos, applyClusterfileCmd}
	if err := c.CmdAsync(EIP, cmds...); err != nil {
		return fmt.Errorf("write clusterfile to remote failed: %v", err)
	}

	return nil
}

func getMasterClusterfile(c ssh.Interface, cluster *v1.Cluster, EIP string) (*v1beta1.Cluster, error) {
	path := filepath.Join(defaultWorkDir, cluster.Name, defaultClusterFileName)
	cmd := fmt.Sprintf(getClusterfileCmd, path)
	out, err := c.Cmd(EIP, cmd)
	if err != nil {
		return nil, fmt.Errorf("get clusterfile on master failed")
	}
	currentCluster := &v1beta1.Cluster{}
	err = yaml.Unmarshal(out, currentCluster)
	if err != nil {
		return nil, fmt.Errorf("unmarshall yaml failed: %v", err)
	}
	return currentCluster, nil
}

// SetupWithManager sets up the controller with the Manager.
func (r *ClusterReconciler) SetupWithManager(mgr ctrl.Manager) error {
	const controllerName = "cluster_controller"
	r.Logger = ctrl.Log.WithName(controllerName)
	driver, err := drivers.NewDriver()

	if err != nil {
		return fmt.Errorf("cluster controller new driver failed: %v", err)
	}
	r.driver = driver
	r.recorder = mgr.GetEventRecorderFor("sealos-cluster-controller")

	return ctrl.NewControllerManagedBy(mgr).
		For(&v1.Cluster{}).
		Watches(&source.Kind{Type: &infrav1.Infra{}}, &handler.EnqueueRequestForObject{}).
		Complete(r)
}
