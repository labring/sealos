package template

import (
	"bytes"
	"fmt"
	"testing"
)

func TestTemplateSemverCompare(t *testing.T) {
	v, b, e := TryParse(`
version: {{if (semverCompare "^1.26.0" (default "" .ENV)) }}v1{{ else }}v1alpha2{{ end }}
`)
	if e != nil {
		t.Errorf("parse err: %v", e)
	}
	if !b {
		t.Errorf("parse failed: %v", b)
	}

	out := bytes.NewBuffer(nil)
	execErr := v.Execute(out, map[string]interface{}{
		// comment out this to test true return
		// "ENV": "v1.26.1",
	})
	if execErr != nil {
		t.Errorf("template exec err: %v", execErr)
	}

	fmt.Println(out)
}
