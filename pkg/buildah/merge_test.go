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

package buildah

import (
	"testing"

	v1 "github.com/opencontainers/image-spec/specs-go/v1"
)

func TestMerge(t *testing.T) {
	type args struct {
		ociList []v1.Image
		images  []string
	}
	tests := []struct {
		name     string
		args     args
		wantErr  bool
		wantData string
	}{
		{
			name: "",
			args: args{
				ociList: []v1.Image{
					{
						Config: v1.ImageConfig{
							Env:        []string{"aa=bb", "cc=dd", "ee=ff"},
							Entrypoint: []string{"ffff"},
							Cmd:        []string{"ffff"},
							Labels:     map[string]string{"aa": "bb"},
						},
					},
					{
						Config: v1.ImageConfig{
							Env:        []string{"ff=gg", "aa=dd"},
							Entrypoint: []string{"eeee", "aaaa"},
							Cmd:        []string{"eeee"},
							Labels:     map[string]string{"aa": "cc", "bb": "cc"},
						},
					},
				},
				images: []string{"aaaa"},
			},
			wantData: `FROM scratch
MAINTAINER labring
LABEL aa="cc"
LABEL bb="cc"
ENV aa=dd
ENV cc=dd
ENV ee=ff
ENV ff=gg
ENTRYPOINT ["ffff","eeee","aaaa"]
CMD ["ffff","eeee"]
COPY --from=aaaa  . .`,
			wantErr: false,
		},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if data, err := mergeMountPath(tt.args.ociList, tt.args.images...); (err != nil) != tt.wantErr {
				t.Errorf("mergeMountPath() error = %v, wantErr %v", err, tt.wantErr)
			} else {
				if data != tt.wantData {
					t.Errorf("mergeMountPath() data = %v, wantData %v", data, tt.wantData)
				}
			}
		})
	}
}
