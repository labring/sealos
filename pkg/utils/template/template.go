/*
Copyright 2022 cuisongliu@qq.com.

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

package template

// nosemgrep: go.lang.security.audit.xss.import-text-template.import-text-template
import (
	"bytes"
	"text/template"
)

func FromContent(templateContent string, param interface{}) (string, error) {
	tmpl := template.Must(template.New("text").Parse(templateContent))
	var buffer bytes.Buffer
	err := tmpl.Execute(&buffer, param)
	bs := buffer.Bytes()
	if nil != bs && len(bs) > 0 {
		return string(bs), nil
	}
	return "", err
}
