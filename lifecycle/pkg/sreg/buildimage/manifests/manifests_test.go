// Copyright © 2021 Alibaba Group Holding Ltd.
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

package manifests

import (
	"reflect"
	"sort"
	"testing"
)

func TestListImages(t *testing.T) {
	type args struct {
		clusterName string
	}
	tests := []struct {
		name    string
		args    args
		want    []string
		wantErr bool
	}{
		{
			"test list manifests images",
			args{"my_cluster"},
			[]string{"k8s.gcr.io/etcd:3.4.13-0", "k8s.gcr.io/kube-apiserver:v1.19.7", "k8s.gcr.io/kube-controller-manager:v1.19.7", "k8s.gcr.io/kube-scheduler:v1.19.7"},
			false,
		},
	}
	manifests, _ := NewManifests()
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got, err := manifests.ListImages(tt.args.clusterName)
			if (err != nil) != tt.wantErr {
				t.Errorf("ListImages() error = %v, wantErr %v", err, tt.wantErr)
				return
			}
			sort.Strings(got)
			sort.Strings(tt.want)
			if !reflect.DeepEqual(got, tt.want) {
				t.Errorf("ListImages() got = %v, want %v", got, tt.want)
			}
		})
	}
}
