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
	"testing"
)

func TestBuildConnectionFileContent(t *testing.T) {
	conns := []string{
		"mysql://user:passwd@localhost:3306/db",
		"pgsql://user:passwd@acid-zz-test.ns-n2rgpgf7.svc.cluster.local",
	}

	content := buildConnectionFileContent(conns)
	if content == "" {
		t.Fatal("content should not be empty")
	}
}
