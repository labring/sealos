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

package controllers

import (
	"fmt"

	networkingv1 "k8s.io/api/networking/v1"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"

	terminalv1 "github.com/labring/sealos/controllers/terminal/api/v1"
)

const (
	//TODO : higress currently do not support
	safeConfigurationSnippet = `
set $flag 0;
if ($http_upgrade = 'websocket') {set $flag "${flag}1";}
if ($http_sec_fetch_site !~ 'same-.*') {set $flag "${flag}2";}
if ($flag = '02'){ return 403; }`
)

func (r *TerminalReconciler) createNginxIngress(terminal *terminalv1.Terminal, host string) *networkingv1.Ingress {
	cors := fmt.Sprintf("https://%s,https://*.%s", r.CtrConfig.Global.CloudDomain+r.getPort(), r.CtrConfig.Global.CloudDomain+r.getPort())

	objectMeta := metav1.ObjectMeta{
		Name:      terminal.Name,
		Namespace: terminal.Namespace,
		Annotations: map[string]string{
			"kubernetes.io/ingress.class":                        "nginx",
			"nginx.ingress.kubernetes.io/proxy-send-timeout":     "86400",
			"nginx.ingress.kubernetes.io/proxy-read-timeout":     "86400",
			"nginx.ingress.kubernetes.io/proxy-body-size":        "32m",
			"nginx.ingress.kubernetes.io/proxy-buffer-size":      "64k",
			"nginx.ingress.kubernetes.io/enable-cors":            "true",
			"nginx.ingress.kubernetes.io/cors-allow-origin":      cors,
			"nginx.ingress.kubernetes.io/cors-allow-methods":     "PUT, GET, POST, PATCH, OPTIONS",
			"nginx.ingress.kubernetes.io/cors-allow-credentials": "false",
			"nginx.ingress.kubernetes.io/configuration-snippet":  safeConfigurationSnippet,
		},
	}

	pathType := networkingv1.PathTypePrefix
	paths := []networkingv1.HTTPIngressPath{{
		PathType: &pathType,
		Path:     "/",
		Backend: networkingv1.IngressBackend{
			Service: &networkingv1.IngressServiceBackend{
				Name: terminal.Status.ServiceName,
				Port: networkingv1.ServiceBackendPort{
					Number: 8080,
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
		SecretName: r.CtrConfig.TerminalConfig.IngressTLSSecretName,
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
