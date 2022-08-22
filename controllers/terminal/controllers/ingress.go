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
	certv1 "github.com/cert-manager/cert-manager/pkg/apis/certmanager/v1"
	cmmeta "github.com/cert-manager/cert-manager/pkg/apis/meta/v1"
	networkingv1 "k8s.io/api/networking/v1"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"

	terminalv1 "github.com/labring/sealos/controllers/terminal/api/v1"
)

const ClusterIssuerName = "cluster-issuer-terminal"

func createCert(terminal *terminalv1.Terminal) *certv1.Certificate {
	objectMeta := metav1.ObjectMeta{
		Name:      terminal.Name,
		Namespace: terminal.Namespace,
	}
	secretName := terminal.Name + "-terminal-sealos-io-cert"
	dnsName := terminal.Name + ".cloud.sealos.io"
	cert := &certv1.Certificate{
		ObjectMeta: objectMeta,
		Spec: certv1.CertificateSpec{
			SecretName: secretName,
			DNSNames:   []string{dnsName},
			IssuerRef: cmmeta.ObjectReference{
				Name: ClusterIssuerName,
				Kind: "ClusterIssuer",
			},
		},
	}

	return cert
}

func createIngress(terminal *terminalv1.Terminal) *networkingv1.Ingress {
	objectMeta := metav1.ObjectMeta{
		Name:      terminal.Name,
		Namespace: terminal.Namespace,
		Annotations: map[string]string{
			"cert-manager.io/issuer":                     ClusterIssuerName,
			"kubernetes.io/ingress.class":                "nginx",
			"nginx.ingress.kubernetes.io/rewrite-target": "/",
		},
		Labels: map[string]string{
			"k8s-app": "terminal",
		},
	}

	host := terminal.Name + ".cloud.sealos.io"
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

	secretName := terminal.Name + "-terminal-sealos-io-cert"
	tls := networkingv1.IngressTLS{
		Hosts:      []string{host},
		SecretName: secretName,
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
