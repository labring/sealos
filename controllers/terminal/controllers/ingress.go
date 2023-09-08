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
	"time"

	apisix "github.com/apache/apisix-ingress-controller/pkg/kube/apisix/apis/config/v2beta3"
	networkingv1 "k8s.io/api/networking/v1"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/util/intstr"

	terminalv1 "github.com/labring/sealos/controllers/terminal/api/v1"
)

const (
	AuthType                 = "basicAuth"
	safeConfigurationSnippet = `
set $flag 0;
if ($http_upgrade = 'websocket') {set $flag "${flag}1";}
if ($http_sec_fetch_site !~ 'same-.*') {set $flag "${flag}2";}
if ($flag = '02'){ return 403; }`
)

func (r *TerminalReconciler) createNginxIngress(terminal *terminalv1.Terminal, host string) *networkingv1.Ingress {
	cors := fmt.Sprintf("https://%s,https://*.%s", r.terminalDomain+r.getPort(), r.terminalDomain+r.getPort())

	objectMeta := metav1.ObjectMeta{
		Name:      terminal.Name,
		Namespace: terminal.Namespace,
		Annotations: map[string]string{
			"kubernetes.io/ingress.class":                        "nginx",
			"nginx.ingress.kubernetes.io/rewrite-target":         "/",
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
				Name: terminal.Name,
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
		SecretName: r.secretName,
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

// TODO: attempt use websocket https://apisix.apache.org/zh/docs/ingress-controller/concepts/apisix_route/#websocket-proxy
func (r *TerminalReconciler) createApisixRoute(terminal *terminalv1.Terminal, host string) *apisix.ApisixRoute {
	// config proxy_read_timeout and proxy_send_timeout
	upstreamTimeout := &apisix.UpstreamTimeout{
		Read: metav1.Duration{
			Duration: time.Hour,
		},
		Send: metav1.Duration{
			Duration: time.Hour,
		},
	}

	// ApisixRoute
	apisixRoute := &apisix.ApisixRoute{
		ObjectMeta: metav1.ObjectMeta{
			Name:      terminal.Name,
			Namespace: terminal.Namespace,
		},
		Spec: apisix.ApisixRouteSpec{
			HTTP: []apisix.ApisixRouteHTTP{
				{
					Name: terminal.Name,
					Match: apisix.ApisixRouteHTTPMatch{
						Hosts: []string{host},
						Paths: []string{"/*"},
					},
					Backends: []apisix.ApisixRouteHTTPBackend{
						{
							ServiceName: terminal.Name,
							ServicePort: intstr.FromInt(8080),
						},
					},
					Timeout: upstreamTimeout,
					Authentication: apisix.ApisixRouteAuthentication{
						Enable: false,
						Type:   AuthType,
					},
				},
			},
		},
	}
	return apisixRoute
}

func (r *TerminalReconciler) createApisixTLS(terminal *terminalv1.Terminal, host string) *apisix.ApisixTls {
	apisixTLS := &apisix.ApisixTls{
		ObjectMeta: metav1.ObjectMeta{
			Name:      terminal.Name,
			Namespace: terminal.Namespace,
		},
		Spec: &apisix.ApisixTlsSpec{
			Hosts: []apisix.HostType{
				apisix.HostType(host),
			},
			Secret: apisix.ApisixSecret{
				Name:      r.secretName,
				Namespace: r.secretNamespace,
			},
		},
	}

	return apisixTLS
}
