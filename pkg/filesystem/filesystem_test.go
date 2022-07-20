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

package filesystem

//
//func TestFileSystem_UnMountRootfs(t *testing.T) {
//	type fields struct {
//		clusterName string
//	}
//	tests := []struct {
//		name    string
//		fields  fields
//		wantErr bool
//	}{
//		{
//			name: "default",
//			fields: fields{
//				clusterName: "default",
//			},
//			wantErr: false,
//		},
//	}
//	logger.CfgConsoleLogger(false, true)
//	for _, tt := range tests {
//		t.Run(tt.name, func(t *testing.T) {
//			f, _ := NewFilesystem(tt.fields.clusterName)
//			if err := f.UnMountRootfs([]string{"192.168.64.15"}); (err != nil) != tt.wantErr {
//				t.Errorf("MountRootfs() error = %v, wantErr %v", err, tt.wantErr)
//			}
//		})
//	}
//}
