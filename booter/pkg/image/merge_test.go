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

package image

import (
	"testing"

	v1 "github.com/opencontainers/image-spec/specs-go/v1"
)

func TestMerge(t *testing.T) {
	type args struct {
		ociList []map[string]v1.Image
	}
	tests := []struct {
		name     string
		args     args
		wantErr  bool
		wantData string
	}{
		{
			name: "merge",
			args: args{
				ociList: []map[string]v1.Image{
					{
						"aaaa": {
							Config: v1.ImageConfig{
								Env:        []string{"aa=bb", "cc=dd", "ee=ff"},
								Entrypoint: []string{"ffff"},
								Cmd:        []string{"ffff"},
								Labels:     map[string]string{"aa": "bb"},
							},
						},
					},
					{
						"ccccc": {
							Config: v1.ImageConfig{
								Env:        []string{"ff=gg", "aa=dd"},
								Entrypoint: []string{"eeee", "aaaa"},
								Cmd:        []string{"eeee"},
								Labels:     map[string]string{"aa": "cc", "bb": "cc"},
							},
						},
					},
				},
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
COPY --from=aaaa  . .
COPY --from=ccccc  . .`,
			wantErr: false,
		},
		{
			name: "merge rootfs",
			args: args{
				ociList: []map[string]v1.Image{
					{
						"aaaa": {
							Config: v1.ImageConfig{
								Labels: map[string]string{"sealos.io.type": "rootfs"},
							},
						},
					},
					{
						"bbbb": {
							Config: v1.ImageConfig{
								Labels: map[string]string{"sealos.io.type": "patch"},
							},
						},
					},
					{
						"cccc": {
							Config: v1.ImageConfig{
								Labels: map[string]string{"sealos.io.type": "application"},
							},
						},
					},
				},
			},
			wantData: `FROM scratch
MAINTAINER labring
LABEL sealos.io.type="rootfs"
COPY --from=aaaa  . .
COPY --from=bbbb  . .
COPY --from=cccc  . .`,
			wantErr: false,
		},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if data, err := MergeDockerfileFromImages(tt.args.ociList); (err != nil) != tt.wantErr {
				t.Errorf("MergeDockerfileFromImages() error = %v, wantErr %v", err, tt.wantErr)
			} else {
				if data != tt.wantData {
					t.Errorf("MergeDockerfileFromImages() data = %v, wantData %v", data, tt.wantData)
				}
			}
		})
	}
}

func Test_replaceDao(t *testing.T) {
	type args struct {
		s string
	}
	tests := []struct {
		name string
		args args
		want string
	}{
		{
			name: "default",
			args: args{
				s: "sealos.io",
			},
			want: "sealos.io",
		},
		{
			name: "default",
			args: args{
				s: "sea$(ss)los.io",
			},
			want: "sea$(ss)los.io",
		},
		{
			name: "default",
			args: args{
				s: "sea$sslos.io",
			},
			want: "sea\\$sslos.io",
		},
		{
			name: "default",
			args: args{
				s: "sea$(s)sl$os.io",
			},
			want: "sea$(s)sl\\$os.io",
		},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if got := escapeDollarSign(tt.args.s, true); got != tt.want {
				t.Errorf("escapeDollarSign() = %v, want %v", got, tt.want)
			}
		})
	}
}
