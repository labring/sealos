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

package clusterfile

import (
	"reflect"
	"testing"

	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/kubernetes/cmd/kubeadm/app/apis/kubeadm"

	"github.com/labring/sealos/pkg/runtime"
	"github.com/labring/sealos/pkg/runtime/kubernetes/types"
	v2 "github.com/labring/sealos/pkg/types/v1beta1"
)

func Test_NewClusterFile(t *testing.T) {
	type args struct {
		cluster       *v2.Cluster
		config        v2.Config
		customEnv     []string
		sets          []string
		values        []string
		customConfigs []string
	}
	tests := []struct {
		name    string
		args    args
		wantErr bool
	}{
		{
			name: "run",
			args: args{
				cluster: &v2.Cluster{
					TypeMeta: metav1.TypeMeta{
						Kind:       "Cluster",
						APIVersion: "apps.sealos.io/v1beta1",
					},
					ObjectMeta: metav1.ObjectMeta{
						Name: "default",
					},
					Spec: v2.ClusterSpec{
						Image: v2.ImageList{
							"dockerhub.tencentcloudcr.com/labring/kubernetes:v1.23.8",
							"dockerhub.tencentcloudcr.com/labring/calico:v3.24.1",
						},
						SSH: v2.SSH{
							User:   "root",
							Passwd: "s3cret",
							Pk:     "/path/to/private/key/file",
							Port:   22,
						},
						Hosts: []v2.Host{
							{
								IPS:   []string{"10.74.16.27:22", "10.74.16.140:22", "10.74.16.101:22"},
								Roles: []string{v2.MASTER, string(v2.AMD64)},
							},
						},
					},
					Status: v2.ClusterStatus{},
				},
				config: v2.Config{
					TypeMeta: metav1.TypeMeta{
						Kind:       "Config",
						APIVersion: "apps.sealos.io/v1beta1",
					},
					ObjectMeta: metav1.ObjectMeta{
						Name: "redis-config",
					},
					Spec: v2.ConfigSpec{
						Path: "etc/redis.yaml",
						Data: "test\n",
					},
				},
				customEnv: []string{
					"SSH_PASSWORD=s3cret",
				},
				sets: []string{
					"clusterName=default",
				},
				values:        []string{"testdata/example.values.yaml"},
				customConfigs: []string{"testdata/config.yaml"},
			},
			wantErr: false,
		},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			cf := NewClusterFile("testdata/clusterfile.yaml",
				WithCustomEnvs(tt.args.customEnv),
				WithCustomSets(tt.args.sets),
				WithCustomValues(tt.args.values),
				WithCustomConfigFiles(tt.args.customConfigs),
			)
			err := cf.Process()

			if (err != nil) != tt.wantErr {
				t.Errorf("newClusterfile(string, ...OptionFunc) error = %v, wantErr %v", err, tt.wantErr)
			}
			equal := reflect.DeepEqual(cf.GetCluster(), tt.args.cluster)
			if !equal {
				t.Errorf("rendered clusterfile not equal")
			}
			if !reflect.DeepEqual(cf.GetConfigs()[0], tt.args.config) {
				t.Error("config not equal")
			}
		})
	}
}

func Test_NoClusterFileWithSingleSchedule(t *testing.T) {
	type args struct {
		runtimeConfig runtime.Config
	}
	tests := []struct {
		name    string
		args    args
		wantErr bool
	}{
		{
			name: "run single with cluster file not exists",
			args: args{
				runtimeConfig: &types.KubeadmConfig{
					InitConfiguration: kubeadm.InitConfiguration{
						SkipPhases: []string{
							"mark-control-plane",
						},
					},
				},
			},
			wantErr: true,
		},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			cf := NewClusterFile("")
			err := cf.Process()
			if (err != nil) != tt.wantErr {
				t.Errorf("newClusterfile(string, ...OptionFunc) error = %v, wantErr %v", err, tt.wantErr)
			}

			if cf.GetCluster() != nil {
				t.Errorf("cluster is not nil")
			}
			if cf.GetConfigs() != nil {
				t.Error("configs is not nil")
			}
			if !reflect.DeepEqual(cf.GetRuntimeConfig(), tt.args.runtimeConfig) {
				t.Error("kubeadmConfig not equal")
			}
		})
	}
}

func Test_NewClusterFileWithSingleSchedule(t *testing.T) {
	type args struct {
		cluster            *v2.Cluster
		config             v2.Config
		runtimeConfig      runtime.Config
		customEnv          []string
		sets               []string
		values             []string
		customConfigs      []string
		customKubeadmFiles []string
	}
	tests := []struct {
		name    string
		args    args
		wantErr bool
	}{
		{
			name: "run single",
			args: args{
				cluster: &v2.Cluster{
					TypeMeta: metav1.TypeMeta{
						Kind:       "Cluster",
						APIVersion: "apps.sealos.io/v1beta1",
					},
					ObjectMeta: metav1.ObjectMeta{
						Name: "default",
					},
					Spec: v2.ClusterSpec{
						Image: v2.ImageList{
							"dockerhub.tencentcloudcr.com/labring/kubernetes:v1.23.8",
							"dockerhub.tencentcloudcr.com/labring/calico:v3.24.1",
						},
						SSH: v2.SSH{
							User:   "root",
							Passwd: "s3cret",
							Pk:     "/path/to/private/key/file",
							Port:   22,
						},
						Hosts: []v2.Host{
							{
								IPS:   []string{"10.74.16.27:22", "10.74.16.140:22", "10.74.16.101:22"},
								Roles: []string{v2.MASTER, string(v2.AMD64)},
							},
						},
					},
					Status: v2.ClusterStatus{},
				},
				config: v2.Config{
					TypeMeta: metav1.TypeMeta{
						Kind:       "Config",
						APIVersion: "apps.sealos.io/v1beta1",
					},
					ObjectMeta: metav1.ObjectMeta{
						Name: "redis-config",
					},
					Spec: v2.ConfigSpec{
						Path: "etc/redis.yaml",
						Data: "test\n",
					},
				},
				runtimeConfig: &types.KubeadmConfig{
					InitConfiguration: kubeadm.InitConfiguration{
						TypeMeta: metav1.TypeMeta{
							APIVersion: "kubeadm.k8s.io/v1beta3",
							Kind:       "InitConfiguration",
						},
						SkipPhases: []string{
							"mark-control-plane",
							"addon/kube-proxy",
						},
					},
				},
				customEnv: []string{
					"SSH_PASSWORD=s3cret",
				},
				sets: []string{
					"clusterName=default",
				},
				values:             []string{"testdata/example.values.yaml"},
				customConfigs:      []string{"testdata/config.yaml"},
				customKubeadmFiles: []string{"testdata/kubeadmConf.yaml"},
			},
			wantErr: false,
		},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			cf := NewClusterFile("testdata/clusterfile.yaml",
				WithCustomEnvs(tt.args.customEnv),
				WithCustomSets(tt.args.sets),
				WithCustomValues(tt.args.values),
				WithCustomConfigFiles(tt.args.customConfigs),
				WithCustomRuntimeConfigFiles(tt.args.customKubeadmFiles),
			)
			err := cf.Process()
			if (err != nil) != tt.wantErr {
				t.Errorf("newClusterfile(string, ...OptionFunc) error = %v, wantErr %v", err, tt.wantErr)
			}

			equal := reflect.DeepEqual(cf.GetCluster(), tt.args.cluster)
			if !equal {
				t.Errorf("rendered clusterfile not equal")
			}
			if !reflect.DeepEqual(cf.GetConfigs()[0], tt.args.config) {
				t.Error("config not equal")
			}
			if !reflect.DeepEqual(cf.GetRuntimeConfig(), tt.args.runtimeConfig) {
				t.Error("kubeadmConfig not equal")
			}
		})
	}
}
