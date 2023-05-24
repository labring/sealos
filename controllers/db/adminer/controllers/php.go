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
	"bytes"
	"net/url"
	"strings"
	"text/template"

	ctrl "sigs.k8s.io/controller-runtime"
)

const (
	adminerPHPTemplate = `<?php
return [
{{range $key, $value := .connectionMap}}    '{{ $key }}' => '{{ $value }}',{{end}}
];
`
)

var (
	adminerPHPTmpl = template.Must(template.New("plugin").Parse(adminerPHPTemplate))
)

func buildConnectionFileContent(connections []string) string {
	// TODO: support custom key name
	connectionMap := map[string]string{}
	for _, connection := range connections {
		urlObj, err := url.Parse(connection)
		if err != nil {
			ctrl.Log.WithName("parse").V(1).Info("parse connection string failed", "err", err)
			continue
		}

		hostname := urlObj.Hostname()
		colon := strings.IndexByte(hostname, '.')
		if colon != -1 {
			hostname = hostname[:colon]
		}

		connectionMap[hostname] = connection
	}

	content, err := renderTemplate(adminerPHPTmpl, map[string]interface{}{
		"connectionMap": connectionMap,
	})
	if err != nil {
		ctrl.Log.WithName("build").V(1).Info("create connection php file failed", "err", err)
	}
	return content
}

func renderTemplate(tmpl *template.Template, data map[string]interface{}) (string, error) {
	var out bytes.Buffer
	err := tmpl.Execute(&out, data)
	if err != nil {
		return "", err
	}
	return out.String(), nil
}
