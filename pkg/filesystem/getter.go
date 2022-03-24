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

import "github.com/fanux/sealos/pkg/utils/ssh"

func (f *FileSystem) getClusterName() string {
	return f.cluster.Name
}
func (f *FileSystem) getImageName() string {
	return f.cluster.Spec.Image
}

func (f *FileSystem) getSSH() ssh.Interface {
	return ssh.NewSSHClient(&f.cluster.Spec.SSH, true)
}
