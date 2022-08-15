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
	"bytes"
	"text/template"

	certv1 "github.com/cert-manager/cert-manager/pkg/apis/certmanager/v1"
	networkingv1 "k8s.io/api/networking/v1"
	"k8s.io/apimachinery/pkg/util/yaml"

	terminalv1 "github.com/labring/sealos/controllers/terminal/api/v1"
)

const CertTmpl = `
apiVersion: cert-manager.io/v1
kind: Certificate
metadata:
  name: {{.ObjectMeta.Name}}
  namespace: {{.ObjectMeta.Namespace}}
spec:
  secretName: {{.ObjectMeta.Name}}-terminal-sealos-io-cert
  dnsNames:
    - {{.ObjectMeta.Name}}.cloud.sealos.io
  issuerRef:
    name: cluster-issuer-terminal
    kind: ClusterIssuer
`

const IngressTmpl = `
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  annotations:
    kubernetes.io/ingress.class: nginx
    nginx.ingress.kubernetes.io/rewrite-target: /
    cert-manager.io/issuer: cluster-issuer-terminal
  name: {{.ObjectMeta.Name}}
  namespace: {{.ObjectMeta.Namespace}}
  labels:
    k8s-app: terminal
spec:
  rules:
    - host: {{.ObjectMeta.Name}}.cloud.sealos.io
      http:
        paths:
          - pathType: Prefix
            path: /
            backend:
              service:
                name: {{.ObjectMeta.Name}}
                port:
                  number: 8080
  tls:
    - hosts:
        - {{.ObjectMeta.Name}}.cloud.sealos.io
      secretName: {{.ObjectMeta.Name}}-terminal-sealos-io-cert

`

func parseTemplate(templateName string, terminal *terminalv1.Terminal) ([]byte, error) {
	tmpl, err := template.New("test").Parse(templateName)
	if err != nil {
		return nil, err
	}
	buf := new(bytes.Buffer)
	err = tmpl.Execute(buf, terminal)
	if err != nil {
		return nil, err
	}
	return buf.Bytes(), nil
}

func createCert(terminal *terminalv1.Terminal) (*certv1.Certificate, error) {
	data, err := parseTemplate(CertTmpl, terminal)
	if err != nil {
		return nil, err
	}
	cert := &certv1.Certificate{}
	err = yaml.Unmarshal(data, cert)
	if err != nil {
		return nil, err
	}
	return cert, nil
}

func createIngress(terminal *terminalv1.Terminal) (*networkingv1.Ingress, error) {
	data, err := parseTemplate(IngressTmpl, terminal)
	if err != nil {
		return nil, err
	}
	ingress := &networkingv1.Ingress{}
	err = yaml.Unmarshal(data, ingress)
	if err != nil {
		return nil, err
	}
	return ingress, nil
}
