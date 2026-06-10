/*
Copyright 2026 sealos.

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
package registry

import (
	"strings"
	"testing"
)

type testPathResolver struct{}

func (testPathResolver) Root() string          { return "/var/lib/sealos/data/default" }
func (testPathResolver) RootFSPath() string    { return "/var/lib/sealos/data/default/rootfs" }
func (testPathResolver) RootFSEtcPath() string { return "/var/lib/sealos/data/default/rootfs/etc" }
func (testPathResolver) RootFSStaticsPath() string {
	return "/var/lib/sealos/data/default/rootfs/statics"
}
func (testPathResolver) RootFSScriptsPath() string {
	return "/var/lib/sealos/data/default/rootfs/scripts"
}
func (testPathResolver) RootFSRegistryPath() string {
	return "/var/lib/sealos/data/default/rootfs/registry"
}
func (testPathResolver) RootFSManifestsPath() string {
	return "/var/lib/sealos/data/default/rootfs/manifests"
}
func (testPathResolver) RootFSBinPath() string { return "/var/lib/sealos/data/default/rootfs/bin" }
func (testPathResolver) RootFSSealctlPath() string {
	return "/var/lib/sealos/data/default/rootfs/opt/sealctl"
}
func (testPathResolver) ConfigsPath() string { return "/var/lib/sealos/data/default/etc" }
func (testPathResolver) RunRoot() string     { return "/var/lib/sealos/default" }
func (testPathResolver) PkiPath() string     { return "/var/lib/sealos/default/pki" }
func (testPathResolver) PkiEtcdPath() string { return "/var/lib/sealos/default/pki/etcd" }
func (testPathResolver) AdminFile() string   { return "/var/lib/sealos/default/admin.conf" }
func (testPathResolver) EtcPath() string     { return "/var/lib/sealos/default/etc" }
func (testPathResolver) TmpPath() string     { return "/var/lib/sealos/default/tmp" }

func TestGetRegistryServeCommandIncludesSupportedFlags(t *testing.T) {
	got := getRegistryServeCommand(testPathResolver{}, "5050", registryServeFlags{
		portFlag:       "--port",
		pidFile:        true,
		disableLogging: true,
	})
	want := "/var/lib/sealos/data/default/rootfs/opt/sealctl registry serve filesystem --port 5050 --pid-file /var/lib/sealos/data/default/rootfs/registry.pid --disable-logging=true /var/lib/sealos/data/default/rootfs/registry >/dev/null 2>&1"
	if got != want {
		t.Fatalf("unexpected serve command:\nwant: %s\n got: %s", want, got)
	}
}

func TestGetRegistryServeCommandOmitsUnsupportedOptionalFlags(t *testing.T) {
	got := getRegistryServeCommand(testPathResolver{}, "5050", registryServeFlags{portFlag: "-p"})
	want := "/var/lib/sealos/data/default/rootfs/opt/sealctl registry serve filesystem -p 5050 /var/lib/sealos/data/default/rootfs/registry >/dev/null 2>&1"
	if got != want {
		t.Fatalf("unexpected serve command:\nwant: %s\n got: %s", want, got)
	}
}

func TestGetRegistryServeCleanupCommandIsScopedToTemporaryRegistry(t *testing.T) {
	got := getRegistryServeCleanupCommand(testPathResolver{})
	for _, want := range []string{
		"/var/lib/sealos/data/default/rootfs/registry.pid",
		"/proc/$pid/cmdline",
		"/var/lib/sealos/data/default/rootfs/opt/sealctl registry serve filesystem",
		"/var/lib/sealos/data/default/rootfs/registry",
	} {
		if !strings.Contains(got, want) {
			t.Fatalf("cleanup command %q does not contain %q", got, want)
		}
	}
}
