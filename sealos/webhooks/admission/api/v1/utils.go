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

package v1

import (
	"strings"

	"github.com/miekg/dns"

	netv1 "k8s.io/api/networking/v1"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
)

const (
	userServiceAccountPrefix = "system:serviceaccount:ns-"
	userNamespacePrefix      = "ns-"
)

func isUserServiceAccount(sa string) bool {
	return strings.HasPrefix(sa, userServiceAccountPrefix)
}

func isUserNamespace(ns string) bool {
	return strings.HasPrefix(ns, userNamespacePrefix)
}

func hasSubDomain(i *netv1.Ingress, domain string) bool {
	for _, r := range i.Spec.Rules {
		if dns.IsSubDomain(domain, r.Host) {
			return true
		}
	}
	return false
}

func initAnnotationAndLabels(meta *metav1.ObjectMeta) {
	if meta.Annotations == nil {
		meta.Annotations = make(map[string]string)
	}
	if meta.Labels == nil {
		meta.Labels = make(map[string]string)
	}
}
