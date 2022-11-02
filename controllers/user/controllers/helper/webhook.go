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

package helper

import (
	"sigs.k8s.io/controller-runtime/pkg/client"

	"k8s.io/client-go/rest"

	"k8s.io/client-go/tools/clientcmd/api"
)

type Webhook struct {
	*Config
}

func (c *Webhook) KubeConfig(config *rest.Config, client client.Client) (*api.Config, error) {
	// make sure cadata is loaded into config under incluster mode
	ctx := "webhook"
	return &api.Config{
		Clusters: map[string]*api.Cluster{
			c.ClusterName: {
				Server:                c.WebhookURL,
				InsecureSkipTLSVerify: true,
			},
		},

		Contexts: map[string]*api.Context{
			ctx: {
				Cluster:  c.ClusterName,
				AuthInfo: "webhook-user",
			},
		},
		AuthInfos: map[string]*api.AuthInfo{
			"webhook-user": {},
		},
		CurrentContext: ctx,
	}, nil
}
