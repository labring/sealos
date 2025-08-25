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

package kubeconfig

import (
	"fmt"

	"sigs.k8s.io/controller-runtime/pkg/client"

	"k8s.io/client-go/rest"

	"k8s.io/client-go/tools/clientcmd/api"
)

func (c *WebhookConfig) Apply(_ *rest.Config, _ client.Client) (*api.Config, error) {
	// make sure cadata is loaded into config under incluster mode
	ctx := fmt.Sprintf("%s@%s", c.user, c.clusterName)
	return &api.Config{
		Clusters: map[string]*api.Cluster{
			c.clusterName: {
				Server:                c.webhookURL,
				InsecureSkipTLSVerify: true,
			},
		},
		Contexts: map[string]*api.Context{
			ctx: {
				Cluster:  c.clusterName,
				AuthInfo: "webhook-user",
			},
		},
		AuthInfos: map[string]*api.AuthInfo{
			"webhook-user": {},
		},
		CurrentContext: ctx,
	}, nil
}
