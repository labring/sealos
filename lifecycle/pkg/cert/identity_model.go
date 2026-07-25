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

package cert

import "github.com/Masterminds/semver/v3"

const (
	legacyPrivilegedGroup = "system:masters"
	clusterAdminsGroup    = "kubeadm:cluster-admins"
)

var kube1290 = semver.MustParse("v1.29.0")

type localIdentityModel struct {
	DefaultAdminOrganizations        []string
	IncludeSuperAdminKubeConfig      bool
	SuperAdminClientName             string
	SuperAdminOrganizations          []string
	APIServerKubeletOrganizations    []string
	APIServerEtcdClientOrganizations []string
	EtcdHealthcheckOrganizations     []string
}

func resolveLocalIdentityModel(kubeVersion string) localIdentityModel {
	if kubeVersion != "" {
		if version, err := semver.NewVersion(kubeVersion); err == nil && !version.LessThan(kube1290) {
			return localIdentityModel{
				DefaultAdminOrganizations:        []string{clusterAdminsGroup},
				IncludeSuperAdminKubeConfig:      true,
				SuperAdminClientName:             "kubernetes-super-admin",
				SuperAdminOrganizations:          []string{legacyPrivilegedGroup},
				APIServerKubeletOrganizations:    []string{clusterAdminsGroup},
				APIServerEtcdClientOrganizations: nil,
				EtcdHealthcheckOrganizations:     nil,
			}
		}
	}

	return localIdentityModel{
		DefaultAdminOrganizations:        []string{legacyPrivilegedGroup},
		IncludeSuperAdminKubeConfig:      false,
		SuperAdminClientName:             "kubernetes-super-admin",
		SuperAdminOrganizations:          []string{legacyPrivilegedGroup},
		APIServerKubeletOrganizations:    []string{legacyPrivilegedGroup},
		APIServerEtcdClientOrganizations: []string{legacyPrivilegedGroup},
		EtcdHealthcheckOrganizations:     []string{legacyPrivilegedGroup},
	}
}

func usesClusterAdminsIdentityModel(kubeVersion string) bool {
	return resolveLocalIdentityModel(kubeVersion).IncludeSuperAdminKubeConfig
}

func UsesClusterAdminsIdentityModel(kubeVersion string) bool {
	return usesClusterAdminsIdentityModel(kubeVersion)
}
