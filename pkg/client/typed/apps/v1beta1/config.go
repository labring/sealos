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

package v1beta1

import (
	"context"
	v1 "github.com/fanux/sealos/pkg/types/v1beta1"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
)

var _ ConfigInterface = &configs{}


// ConfigInterface has methods to work with Config resources.
type ConfigInterface interface {
	Create(ctx context.Context, deployment *v1.Config, opts metav1.CreateOptions) (*v1.Config, error)
	Update(ctx context.Context, deployment *v1.Config, opts metav1.UpdateOptions) (*v1.Config, error)
	Delete(ctx context.Context, name string, opts metav1.DeleteOptions) error
	Get(ctx context.Context, name string, opts metav1.GetOptions) (*v1.Config, error)
}

type ConfigsGetter interface {
	Configs() ConfigInterface
}

type configs struct {
}

func newConfigs(c *AppsV1Beta1Client) *configs {
	return &configs{}
}

func (*configs) Create(ctx context.Context, config *v1.Config, opts metav1.CreateOptions) (*v1.Config, error) {
	return nil, nil
}
func (*configs) Update(ctx context.Context, config *v1.Config, opts metav1.UpdateOptions) (*v1.Config, error) {
	return nil, nil
}
func (*configs) Delete(ctx context.Context, name string, opts metav1.DeleteOptions) error {
	return nil
}
func (*configs) Get(ctx context.Context, name string, opts metav1.GetOptions) (*v1.Config, error) {
	return nil, nil
}
