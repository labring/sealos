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
