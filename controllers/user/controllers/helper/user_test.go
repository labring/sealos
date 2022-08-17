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

package helper

import (
	"os"
	"testing"
)

func TestGenerateKubeConfig(t *testing.T) {
	data, err := GenerateKubeConfig(Config{
		CAKeyFile:   "ca.key",
		User:        "cuisongliu",
		DNSNames:    nil,
		IPAddresses: nil,
	})
	if err != nil {
		t.Error(err)
		return
	}
	err = os.WriteFile("output", data, 0600)
	if err != nil {
		t.Error(err)
		return
	}
}
