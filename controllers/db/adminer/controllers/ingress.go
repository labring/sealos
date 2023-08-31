/*
Copyright 2023 labring.

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
	"strings"
	"time"

	apisix "github.com/apache/apisix-ingress-controller/pkg/kube/apisix/apis/config/v2beta3"
	networkingv1 "k8s.io/api/networking/v1"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/util/intstr"

	adminerv1 "github.com/labring/sealos/controllers/db/adminer/api/v1"
)

const (
	AuthType = "basicAuth"
)

func (r *AdminerReconciler) createNginxIngress(adminer *adminerv1.Adminer, host string) *networkingv1.Ingress {
	corsFormat := "https://%s,https://*.%s"
	if !r.tlsEnabled {
		corsFormat = "http://%s,http://*.%s"
	}
	cors := fmt.Sprintf(corsFormat, r.adminerDomain, r.adminerDomain)

	objectMeta := metav1.ObjectMeta{
		Name:      adminer.Name,
		Namespace: adminer.Namespace,
		Annotations: map[string]string{
			"kubernetes.io/ingress.class":                        "nginx",
			"nginx.ingress.kubernetes.io/rewrite-target":         "/",
			"nginx.ingress.kubernetes.io/proxy-send-timeout":     "86400",
			"nginx.ingress.kubernetes.io/proxy-read-timeout":     "86400",
			"nginx.ingress.kubernetes.io/proxy-body-size":        "256m",
			"nginx.ingress.kubernetes.io/proxy-buffer-size":      "64k",
			"nginx.ingress.kubernetes.io/enable-cors":            "true",
			"nginx.ingress.kubernetes.io/cors-allow-origin":      cors,
			"nginx.ingress.kubernetes.io/cors-allow-methods":     "PUT, GET, POST, PATCH, OPTIONS",
			"nginx.ingress.kubernetes.io/cors-allow-credentials": "false",
			"nginx.ingress.kubernetes.io/configuration-snippet":  r.getNginxConfigurationSnippet(),
		},
	}

	pathType := networkingv1.PathTypePrefix
	paths := []networkingv1.HTTPIngressPath{{
		PathType: &pathType,
		Path:     "/",
		Backend: networkingv1.IngressBackend{
			Service: &networkingv1.IngressServiceBackend{
				Name: adminer.Name,
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

	ingress := &networkingv1.Ingress{
		ObjectMeta: objectMeta,
		Spec: networkingv1.IngressSpec{
			Rules: []networkingv1.IngressRule{rule},
		},
	}

	if r.tlsEnabled {
		tls := networkingv1.IngressTLS{
			Hosts:      []string{host},
			SecretName: r.secretName,
		}
		ingress.Spec.TLS = []networkingv1.IngressTLS{tls}
	}
	return ingress
}

// TODO: attempt use websocket https://apisix.apache.org/zh/docs/ingress-controller/concepts/apisix_route/#websocket-proxy
func (r *AdminerReconciler) createApisixRoute(adminer *adminerv1.Adminer, host string) *apisix.ApisixRoute {
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
			Name:      adminer.Name,
			Namespace: adminer.Namespace,
		},
		Spec: apisix.ApisixRouteSpec{
			HTTP: []apisix.ApisixRouteHTTP{
				{
					Name: adminer.Name,
					Match: apisix.ApisixRouteHTTPMatch{
						Hosts: []string{host},
						Paths: []string{"/*"},
					},
					Backends: []apisix.ApisixRouteHTTPBackend{
						{
							ServiceName: adminer.Name,
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

func (r *AdminerReconciler) createApisixTLS(adminer *adminerv1.Adminer, host string) *apisix.ApisixTls {
	apisixTLS := &apisix.ApisixTls{
		ObjectMeta: metav1.ObjectMeta{
			Name:      adminer.Name,
			Namespace: adminer.Namespace,
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

const (
	defaultNginxConfigurationSnippet = `
more_clear_headers "X-Frame-Options:";
more_set_headers "Content-Security-Policy: default-src * blob: data: *.cloud.sealos.io cloud.sealos.io; img-src * data: blob: resource: *.cloud.sealos.io cloud.sealos.io; connect-src * wss: blob: resource:; style-src 'self' 'unsafe-inline' blob: *.cloud.sealos.io cloud.sealos.io resource:; script-src 'self' 'unsafe-inline' 'unsafe-eval' blob: *.cloud.sealos.io cloud.sealos.io resource: *.baidu.com *.bdstatic.com; frame-src 'self' cloud.sealos.io *.cloud.sealos.io mailto: tel: weixin: mtt: *.baidu.com; frame-ancestors 'self' https://cloud.sealos.io https://*.cloud.sealos.io";
more_set_headers "X-Xss-Protection: 1; mode=block";

if ($request_uri ~* \.(js|css|gif|jpe?g|png)) {
expires 30d;
add_header Cache-Control "public";
}`
	defaultConfigDomain = "cloud.sealos.io"
)

func (r *AdminerReconciler) getNginxConfigurationSnippet() string {
	if defaultConfigDomain != r.adminerDomain {
		return strings.ReplaceAll(defaultNginxConfigurationSnippet, defaultConfigDomain, r.adminerDomain)
	}

	return defaultNginxConfigurationSnippet
}
