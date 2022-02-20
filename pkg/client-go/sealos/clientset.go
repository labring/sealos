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

package sealos

import (
	"github.com/fanux/sealos/pkg/client-go/sealos/typed/apps/v1beta1"
)

var _ Interface = &Clientset{}

type Interface interface {
	AppsV1beta1() v1beta1.AppsV1Beta1Interface
}

// Clientset contains the clients for groups. Each group has exactly one
// version included in a Clientset.
type Clientset struct {
	appsv1beta1 *v1beta1.AppsV1Beta1Client
}

// AppsV1beta1 retrieves the AppsV1Beta1Client
func (c *Clientset) AppsV1beta1() v1beta1.AppsV1Beta1Interface {
	return c.appsv1beta1
}

// NewForConfig creates a new Clientset for the given config.
// If config's RateLimiter is not set and QPS and Burst are acceptable,
// NewForConfig will generate a rate-limiter in configShallowCopy.
func NewForConfig(config string) (*Clientset, error) {
	var cs Clientset
	var err error
	cs.appsv1beta1, err = v1beta1.NewForConfig(config)
	if err != nil {
		return nil, err
	}
	return &cs, nil
}

// NewForConfigOrDie creates a new Clientset for the given config and
// panics if there is an error in the config.
func NewForConfigOrDie(config string) *Clientset {
	var cs Clientset
	cs.appsv1beta1 = v1beta1.NewForConfigOrDie(config)
	return &cs
}
