/*
Copyright 2023 yxxchange@163.com.

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
package cloudclient

import (
	"context"
	_ "context"
	"errors"
	"fmt"
	"io/ioutil"
	"net/http"
	"time"

	"encoding/json"

	ntf "github.com/labring/sealos/controllers/common/notification/api/v1"
	lgr "github.com/labring/sealos/pkg/utils/logger"
	"sigs.k8s.io/controller-runtime/pkg/client"
)

type contextKey string

const (
	nameKey      contextKey = "name"
	namespaceKey contextKey = "namespace"
)

type CloudClient struct {
	CloudURL string
	HttpBody []byte
	ctx      context.Context
	Timer    <-chan time.Time
	// apply CR to K8s
	ctlToApiServer client.Client
}

func (cc *CloudClient) Get() error {
	resp, err := http.Get(cc.CloudURL)

	if err != nil {
		fmt.Println("http.Get() error")
		return err
	}

	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		fmt.Println("StatusCode error")
		return errors.New("error: StatusCode is Not OK")
	}

	body, err := ioutil.ReadAll(resp.Body)
	if err != nil {
		fmt.Println("ReadAll")
		return nil
	}
	cc.HttpBody = body
	return nil
}

func (cc *CloudClient) Init(clt client.Client) {
	name := "CloudClient"
	namespace := "default"
	cc.CloudURL = "https://hfx0m9.laf.dev/CloudNotification"
	cc.Timer = time.Tick(time.Second * 10)
	cc.ctx = context.Background()
	cc.ctx = context.WithValue(cc.ctx, nameKey, name)
	cc.ctx = context.WithValue(cc.ctx, namespaceKey, namespace)
	cc.ctlToApiServer = clt
}

func (cc *CloudClient) Ticker() error {

	for range cc.Timer {
		lgr.Info("Timer triggered")
		if err := cc.Get(); err != nil {
			lgr.Info("ClientForLafError: ", err)
			return err
		}
		var CloudNTF ntf.Notification

		if err := json.Unmarshal(cc.HttpBody, &CloudNTF); err != nil {
			lgr.Info("ClientForLafError: ", "error body ", err)
			return err
		}
		fmt.Println(CloudNTF.CreationTimestamp)
		fmt.Println(CloudNTF.Namespace)
		if err := cc.ctlToApiServer.Create(cc.ctx, &CloudNTF); err != nil {
			lgr.Info("CloudNotificationCreateError: ", err)
			return err
		}
	}
	return nil
}
