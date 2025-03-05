/*
Copyright 2023 cuisongliu@qq.com.

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

package operators

type FakeImageInterface interface {
	ListImages(display bool) ([]DisplayImage, error)
	PullImage(images ...string) error
	BuildImage(image, context string, opts BuildOptions) error
	RemoveImage(images ...string) error
	DockerArchiveImage(name string) error
	OCIArchiveImage(name string) error
	SaveImage(name, file string) error
	SaveMultiImage(file string, name ...string) error
	TagImage(name, newName string) error
	LoadImage(file string) error
	Create(name string, short bool) ([]byte, error)
	Merge(newImage string, images []string) error
	FetchImageID(name string) (string, error)
}

type FakeCRIInterface interface {
	Pull(name string) error
	ImageList() (*ImageStruct, error)
	HasImage(name string) error
}

type FakeClusterInterface interface {
	Run(images ...string) error
	Apply(file string) error
	Reset() error
}

type FakeInspectInterface interface {
	LocalImage(name string) error
	RemoteImage(name string) error
	DockerArchiveImage(name string) error
	OCIArchiveImage(name string) error
	ImageID(id string) error
}

type FakeCertInterface interface {
	AddDomain(domain string) error
}
