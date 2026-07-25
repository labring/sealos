// Copyright © 2026 sealos.
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

package kubernetes

import "testing"

func TestValidateRenewGroups(t *testing.T) {
	tests := []struct {
		name      string
		targets   []string
		renewAll  bool
		groups    []string
		expectErr bool
	}{
		{
			name:     "allow nil groups",
			targets:  []string{ControllerConf},
			renewAll: false,
			groups:   nil,
		},
		{
			name:     "allow all target",
			targets:  []string{"all"},
			renewAll: true,
			groups:   []string{"custom:group"},
		},
		{
			name:     "allow admin target",
			targets:  []string{AdminConf},
			renewAll: false,
			groups:   []string{"custom:group"},
		},
		{
			name:      "reject non admin targets",
			targets:   []string{ControllerConf, SchedulerConf},
			renewAll:  false,
			groups:    []string{"custom:group"},
			expectErr: true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			err := validateRenewGroups(tt.targets, tt.renewAll, tt.groups)
			if (err != nil) != tt.expectErr {
				t.Fatalf("validateRenewGroups() error = %v, expectErr %v", err, tt.expectErr)
			}
		})
	}
}

func TestDefaultLocalKubeConfigFiles(t *testing.T) {
	tests := []struct {
		version string
		want    []string
	}{
		{
			version: "v1.28.9",
			want:    []string{AdminConf, ControllerConf, SchedulerConf, KubeletConf},
		},
		{
			version: "v1.29.0",
			want:    []string{AdminConf, ControllerConf, SchedulerConf, KubeletConf, SuperAdminConf},
		},
	}

	for _, tt := range tests {
		got := defaultLocalKubeConfigFiles(tt.version)
		if len(got) != len(tt.want) {
			t.Fatalf("defaultLocalKubeConfigFiles(%q) = %v, want %v", tt.version, got, tt.want)
		}
		for i := range got {
			if got[i] != tt.want[i] {
				t.Fatalf("defaultLocalKubeConfigFiles(%q) = %v, want %v", tt.version, got, tt.want)
			}
		}
	}
}

func TestNormalizeRenewTargetsAllowsSuperAdmin(t *testing.T) {
	targets, renewAll, err := normalizeRenewTargets([]string{SuperAdminConf})
	if err != nil {
		t.Fatalf("normalizeRenewTargets() error = %v", err)
	}
	if renewAll {
		t.Fatal("expected super-admin target not to imply renewAll")
	}
	if len(targets) != 1 || targets[0] != SuperAdminConf {
		t.Fatalf("normalizeRenewTargets() = %v, want [%s]", targets, SuperAdminConf)
	}
}

func TestNormalizeRenewTargetsRejectsSystemCertificates(t *testing.T) {
	if _, _, err := normalizeRenewTargets([]string{"apiserver-kubelet-client"}); err == nil {
		t.Fatal("expected system certificate targets to be rejected")
	}
}

func TestEffectiveLocalKubeConfigRenewTargets(t *testing.T) {
	tests := []struct {
		name    string
		targets []string
		version string
		want    []string
	}{
		{
			name:    "pre v129 keeps admin target only",
			targets: []string{AdminConf},
			version: "v1.28.9",
			want:    []string{AdminConf},
		},
		{
			name:    "v129 adds super admin alongside admin",
			targets: []string{AdminConf},
			version: "v1.29.0",
			want:    []string{AdminConf, SuperAdminConf},
		},
		{
			name:    "v129 does not duplicate explicit super admin target",
			targets: []string{AdminConf, SuperAdminConf},
			version: "v1.29.0",
			want:    []string{AdminConf, SuperAdminConf},
		},
	}

	for _, tt := range tests {
		got := effectiveLocalKubeConfigRenewTargets(tt.targets, tt.version)
		if len(got) != len(tt.want) {
			t.Fatalf("effectiveLocalKubeConfigRenewTargets(%v, %q) = %v, want %v", tt.targets, tt.version, got, tt.want)
		}
		for i := range got {
			if got[i] != tt.want[i] {
				t.Fatalf("effectiveLocalKubeConfigRenewTargets(%v, %q) = %v, want %v", tt.targets, tt.version, got, tt.want)
			}
		}
	}
}

func TestRemoteControlPlaneKubeConfigFilesExcludeSuperAdmin(t *testing.T) {
	tests := []struct {
		includeKubelet bool
		want           []string
	}{
		{
			includeKubelet: false,
			want:           []string{AdminConf, ControllerConf, SchedulerConf},
		},
		{
			includeKubelet: true,
			want:           []string{AdminConf, ControllerConf, SchedulerConf, KubeletConf},
		},
	}

	for _, tt := range tests {
		got := remoteControlPlaneKubeConfigFiles(tt.includeKubelet)
		if len(got) != len(tt.want) {
			t.Fatalf("remoteControlPlaneKubeConfigFiles(%v) = %v, want %v", tt.includeKubelet, got, tt.want)
		}
		for i := range got {
			if got[i] != tt.want[i] {
				t.Fatalf("remoteControlPlaneKubeConfigFiles(%v) = %v, want %v", tt.includeKubelet, got, tt.want)
			}
		}
	}
}

func TestValidateRenewGroupsAllowsAll(t *testing.T) {
	if err := validateRenewGroups([]string{"all"}, true, []string{"custom:group"}); err != nil {
		t.Fatalf("validateRenewGroups(all) error = %v", err)
	}
}
