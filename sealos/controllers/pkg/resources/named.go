// Copyright © 2023 sealos.
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

package resources

import (
	"strings"

	"github.com/labring/sealos/controllers/pkg/utils/label"

	corev1 "k8s.io/api/core/v1"

	"sigs.k8s.io/controller-runtime/pkg/client"
)

const (
	DBPodLabelInstanceKey       = "app.kubernetes.io/instance"
	DBPodLabelComponentNameKey  = "apps.kubeblocks.io/component-name"
	TerminalIDLabelKey          = "TerminalID"
	AppLabelKey                 = "app"
	AppDeployLabelKey           = "cloud.sealos.io/app-deploy-manager"
	AppStoreDeployLabelKey      = "cloud.sealos.io/deploy-on-sealos"
	JobNameLabelKey             = "job-name"
	ACMEChallengeKey            = "acme.cert-manager.io/http01-solver"
	KubeBlocksBackUpName        = "kubeblocks-backup-data"
	dataProtectionBackupRepoKey = "dataprotection.kubeblocks.io/backup-repo-name"
	InstanceLabelKey            = "app.kubernetes.io/instance"
)

type ResourceNamed struct {
	_name string
	// db or app or terminal or job or other
	_type      string
	parentType string
	parentName string
	labels     map[string]string
}

func NewResourceNamed(cr client.Object) *ResourceNamed {
	labels := cr.GetLabels()
	p := &ResourceNamed{labels: labels}
	switch {
	case cr.GetName() == KubeBlocksBackUpName || labels[dataProtectionBackupRepoKey] != "":
		p._type = DBBackup
		p._name = KubeBlocksBackUpName
		if labels[InstanceLabelKey] != "" {
			p._name = labels[InstanceLabelKey]
		}
	case labels[DBPodLabelComponentNameKey] != "":
		p._type = DB
		p._name = labels[DBPodLabelInstanceKey]
	case labels[TerminalIDLabelKey] != "" || (labels[label.AppManagedBy] == label.DefaultManagedBy && labels[label.AppPartOf] == "terminal"):
		p._type = TERMINAL
		p._name = ""
	case labels[label.AppPartOf] == "devbox":
		p._type = DevBox
		p._name = labels[label.AppName]
	case labels[AppLabelKey] != "":
		p._type = APP
		p._name = labels[AppLabelKey]
	case labels[AppDeployLabelKey] != "":
		p._type = APP
		p._name = labels[AppDeployLabelKey]
	case labels[JobNameLabelKey] != "":
		p._type = JOB
		p._name = strings.SplitN(labels[JobNameLabelKey], "-", 2)[0]
	case labels[ACMEChallengeKey] != "":
		p._type = APP
		p._name = getACMEResolverName(cr)
	default:
		p._type = OTHER
		p._name = ""
	}
	return p
}

func (r *ResourceNamed) SetInstanceParent(instances map[string]struct{}) {
	for ins := range instances {
		if strings.HasPrefix(r._name, ins) {
			r.parentType = AppStore
			r.parentName = ins
		}
	}
}

func NewObjStorageResourceNamed(bucket string) *ResourceNamed {
	return &ResourceNamed{
		_type: ObjectStorage,
		_name: bucket,
	}
}

const (
	acmesolver                          = "acmesolver"
	acmesolverContainerArgsDomainPrefix = "--domain="
)

func getACMEResolverName(obj client.Object) string {
	pod, ok := obj.(*corev1.Pod)
	if !ok {
		return ""
	}
	for _, container := range pod.Spec.Containers {
		if container.Name != acmesolver {
			continue
		}
		for _, arg := range container.Args {
			if strings.HasPrefix(arg, acmesolverContainerArgsDomainPrefix) {
				return acmesolver + "-" + strings.TrimPrefix(arg, acmesolverContainerArgsDomainPrefix)
			}
		}
	}
	return pod.Name
}

func (r *ResourceNamed) Type() uint8 {
	return AppType[r._type]
}

func (r *ResourceNamed) ParentType() uint8 {
	return AppType[r.parentType]
}

func (r *ResourceNamed) ParentName() string {
	return r.parentName
}

func (r *ResourceNamed) TypeString() string {
	return r._type
}

func (r *ResourceNamed) Name() string {
	return r._name
}

func (r *ResourceNamed) String() string {
	return r._type + "/" + r._name
}
