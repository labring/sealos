// Copyright © 2021 sealos.
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

package settings

import (
	"os"
	"path/filepath"
	"time"

	hd "github.com/mitchellh/go-homedir"
)

const (
	SubCmdInitOfSealos = "init"
	DefaultSSHPassword = "Sealos123"
)

const (
	FileMode0755 = 0755
	FileMode0644 = 0644
)

var (
	DefaultPollingInterval time.Duration
	MaxWaiteTime           time.Duration
	DefaultWaiteTime       time.Duration
	DefaultSealosBin       = ""
	DefaultTestEnvDir      = ""

	AccessKey    = os.Getenv("ACCESSKEYID")
	AccessSecret = os.Getenv("ACCESSKEYSECRET")
)

func GetWorkDir() string {
	home, err := hd.Dir()
	if err != nil {
		return ""
	}
	return filepath.Join(home, ".sealos")
}
