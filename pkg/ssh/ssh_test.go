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

package ssh

import (
	"testing"

	v2 "github.com/labring/sealos/pkg/types/v1beta1"
)

const pk = `-----BEGIN RSA PRIVATE KEY-----
MIIEowIBAAKCAQEAq+vV7fBRIuw2aE/0QbebiZJhKXbvK8FeQeKLnj+eEs06xyQ5
9hbm4rzoduAzv5wiyD+fxiYfJ1hiHUvV+3bHyeevz3e8Tmzt3FWqL8uUYIX+kbJm
T0OAO8sviG32atvSNy7DhtYnlwVidzFukhsPltiSu84rANqmLcKwmDG+KXB3NR9W
je2hJw799UGnazf9Xn/I/027TjqJAs7OIs9a/jEVXAYLbDI3t3HuOM2kNbkPutyz
IKQoYAIxwIO5Wgws7blpt8+wWG6Z9vuRWJ47c53u631KP1XFe9yJMHf71JSk0jLb
d+DTZmVpkhY1ioyJMSxVxx+vEGmLQ7GgN/1ylQIDAQABAoIBAQCgVZFuFnGU4Dbd
kbN6loG4C4wR35mudOgzCdSsASiq4Duw/VgQ6crqKsOiGfYo/LRzjOK1KVhkmUjn
iZJGssAgzLJqCoDTo0Mx+bJ+YJ5AZrbDql1ADvPIz/XEhskJX3jtfe9cEN1bOupZ
vwAfwp0HUXOHMv9oDIJuquOHDN0MRw2Nnj4SiJc47YdrhlCUpwKLCM+ghqRHW7gU
lAVuOJ98hXIuepbOR6QkmcDXhIHebuyfTZDkvzLqeWiQqzMI2vkXye2SpwHa0JMp
...
MOCKDATA
...
RD+1isqrHOo012UTg8ZRPrNqbR8i+xgDcrIgW1ge/mxn5Q02OxFtnmqDq5MntiBg
Fm/gq+iUhN48b7Jm61d7LpEb1OWrNvKwb/mRm+4vp4e94ByKo28OboJHS+8JcQHX
7j63ID0RWfHmtN4FsHpLsKUCgYByPc5wQDUc1JmtsKBgMIAn8UTaCU7hxSp2/Io9
ITMSjoSS/hRDPSr5LVN4uAZG3mVJrJ8zwrPr5r4TZMsNvmq6KdMyJlzv895/8thM
QUPxW6c5EMoDMRhHwxhctYcU4UD/ognOegDRyiZo3OAHPz5rRIa9lYHplj64Qv3l
Vid8AQKBgEsW7rO/CktA3nEB832swsxJpB/8acMRvOoAXkYbH8rPkoDGw89kF8OS
nOQozpnxmjZJob4kuBEB1AbtBqFztTv0VuwsRpBnGuVJkpyL0t91D2o70QNIOjn2
gT3uouYke+NuMeAutesCanG9ZwNMiwHIZgcb8WgRso/M8EWiFBV2
-----END RSA PRIVATE KEY-----`

func TestWaitSSHReady(t *testing.T) {
	s := &v2.SSH{
		User:   "ec2-user",
		PkData: pk,
	}
	ssh := NewSSHClient(s, false)

	type args struct {
		ssh      Interface
		tryTimes int
		hosts    []string
	}
	tests := []struct {
		name    string
		args    args
		wantErr bool
	}{
		{
			name: "test wait ssh ready",
			args: args{
				ssh,
				3,
				[]string{"58.82.22.99"},
			},
			wantErr: false,
		},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if err := WaitSSHReady(tt.args.ssh, tt.args.tryTimes, tt.args.hosts...); (err != nil) != tt.wantErr {
				t.Errorf("WaitSSHReady() error = %v, wantErr %v", err, tt.wantErr)
			}
		})
	}
}
