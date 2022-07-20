/*
Copyright 2022 labring.

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

package drivers

import (
	"github.com/aws/aws-sdk-go-v2/service/ec2/types"
	v1 "github.com/labring/sealos/controllers/infra/api/v1"
)

type Driver interface {
	CreateInstances(infra *v1.Infra) error
	// TODO other cloud instance should convert to aws instance.
	GetInstancesByLabel(key string, value string) ([]types.Instance, error)
}
