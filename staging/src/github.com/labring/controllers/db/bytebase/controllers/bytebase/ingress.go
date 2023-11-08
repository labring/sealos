/*
Copyright 2022 labring.

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

package bytebase

import (
	bbv1 "github.com/labring/sealos/controllers/db/bytebase/apis/bytebase/v1"
	networkingv1 "k8s.io/api/networking/v1"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
)

func (r *Reconciler) createNginxIngress(bytebase *bbv1.Bytebase, host string, snippet string) *networkingv1.Ingress {
	objectMeta := metav1.ObjectMeta{
		Name:      bytebase.Name,
		Namespace: bytebase.Namespace,
		Annotations: map[string]string{
			"kubernetes.io/ingress.class":                       "nginx",
			"nginx.ingress.kubernetes.io/rewrite-target":        "/",
			"nginx.ingress.kubernetes.io/proxy-send-timeout":    "86400",
			"nginx.ingress.kubernetes.io/proxy-read-timeout":    "86400",
			"nginx.ingress.kubernetes.io/configuration-snippet": snippet,
		},
	}

	pathType := networkingv1.PathTypePrefix
	port := bytebase.Spec.Port.IntValue()
	if port == 0 {
		return nil
	}
	paths := []networkingv1.HTTPIngressPath{{
		PathType: &pathType,
		Path:     "/",
		Backend: networkingv1.IngressBackend{
			Service: &networkingv1.IngressServiceBackend{
				Name: bytebase.Name,
				Port: networkingv1.ServiceBackendPort{
					Number: int32(port),
				},
			},
		},
	}}
	rule := networkingv1.IngressRule{
		Host: host,
		IngressRuleValue: networkingv1.IngressRuleValue{
			HTTP: &networkingv1.HTTPIngressRuleValue{
				Paths: paths,
			},
		},
	}

	tls := networkingv1.IngressTLS{
		Hosts:      []string{host},
		SecretName: r.SecretName,
	}

	ingress := &networkingv1.Ingress{
		ObjectMeta: objectMeta,
		Spec: networkingv1.IngressSpec{
			Rules: []networkingv1.IngressRule{rule},
			TLS:   []networkingv1.IngressTLS{tls},
		},
	}
	return ingress
}
