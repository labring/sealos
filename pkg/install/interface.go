// Copyright © 2021 sealos.
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

package install

type Check interface {
	CheckValid()
}

//Send is
type Send interface {
	SendPackage()
}

//PreInit is
type PreInit interface {
	KubeadmConfigInstall()
	InstallMaster0()
}

//Print is
type Print interface {
	Print(process ...string)
}

//Clean is
type Clean interface {
	Clean()
}

//Join is
type Join interface {
	JoinMasters()
	JoinNodes()
	GeneratorToken()
}

type Apply interface {
	KubeApply(name string)
}
