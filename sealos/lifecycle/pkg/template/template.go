// Copyright © 2022 sealos.
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

package template

// nosemgrep: go.lang.security.audit.xss.import-text-template.import-text-template
import (
	"bytes"
	"text/template"
)

var defaultTpl *template.Template

func init() {
	// todo: include helm builtin func map
	defaultTpl = template.New("goTpl").
		Option("missingkey=default").
		Funcs(funcMap())
}

func Parse(text string) (*template.Template, error) {
	return defaultTpl.Parse(text)
}

func TryParse(text string) (*template.Template, bool, error) {
	tmp, err := defaultTpl.Parse(text)
	isFailed := err != nil && err.Error() == "text/template: cannot Parse after Execute"
	return tmp, !isFailed, err
}

func Must(t *template.Template, err error) *template.Template {
	return template.Must(t, err)
}

func RenderTemplate(name, defaultStr string, data map[string]interface{}) (string, error) {
	var out bytes.Buffer
	tmpl := template.Must(template.New(name).Parse(defaultStr))
	err := tmpl.Execute(&out, data)
	if err != nil {
		return "", err
	}
	return out.String(), nil
}
