/*
Copyright 2023.

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

package util

import (
	"context"
	"encoding/json"
	"net/http"
	"os"
	"time"

	"github.com/go-logr/logr"
	cloudv1 "github.com/labring/sealos/controllers/cloud/api/v1"
	cloud "github.com/labring/sealos/controllers/cloud/internal/manager"
	corev1 "k8s.io/api/core/v1"
	apierrors "k8s.io/apimachinery/pkg/api/errors"
	"k8s.io/apimachinery/pkg/types"
	ctrl "sigs.k8s.io/controller-runtime"
	cl "sigs.k8s.io/controller-runtime/pkg/client"
)

const ConfigPath = "/etc/config/config.json"

const (
	TRUE  = "true"
	FALSE = "false"
)

func ReadConfigFile(filepath string, logger logr.Logger) (cloud.Config, error) {
	data, err := os.ReadFile(filepath)
	if err != nil {
		logger.Error(err, "failed to read config file:")
		return cloud.Config{}, err
	}

	var config cloud.Config
	err = json.Unmarshal(data, &config)
	if err != nil {
		logger.Error(err, "failed to parse config file:")
		return cloud.Config{}, err
	}

	return config, nil
}

type OptionCallBack func(ctx context.Context, client cl.Client)

type ImportantResourcePolicy interface {
	Get(ctx context.Context, client cl.Client) error
	Update(ctx context.Context, client cl.Client) error
	Restrict(ctx context.Context, client cl.Client)
}

type ImportanctResource struct {
	resource   cl.Object
	identifier types.NamespacedName
	options    OptionCallBack
}

func NewImportanctResource(r cl.Object, i types.NamespacedName) ImportanctResource {
	return ImportanctResource{
		resource:   r,
		identifier: i,
	}
}

func (ir *ImportanctResource) Get(ctx context.Context, client cl.Client) error {
	return client.Get(ctx, ir.identifier, ir.resource)
}

func (ir *ImportanctResource) Update(ctx context.Context, client cl.Client) error {
	return client.Update(ctx, ir.resource)
}

func (ir *ImportanctResource) Restrict(ctx context.Context, client cl.Client) {
	if ir.options != nil {
		ir.options(ctx, client)
	}
}

// This function is used to retrieve certain variables considered as important resources by this module, such as Secrets and ConfigMaps.
func GetImportantResource(ctx context.Context, client cl.Client, policy ImportantResourcePolicy) *cloud.ErrorMgr {
	var logger = ctrl.Log.WithName("GetImportantResource")
	expire := time.Now().Add(time.Hour).Unix()
	for {
		err := policy.Get(ctx, client)
		switch {
		case err == nil:
			return nil
		case apierrors.IsNotFound(err):
			policy.Restrict(ctx, client)
			return cloud.NewErrorMgr("GetImportantResource failed", "restrict the cluster", err.Error())
		default:
			time.Sleep(time.Second * 10)
			logger.Info("failed to get importance resource,retrying...")
		}
		if time.Now().Unix() > expire {
			break
		}
	}
	return cloud.NewErrorMgr("GetImportantResource failed, time out")
}

// ----------------------------------------------------------------------------------------------------------//

type RegisterAndStartData struct {
	ctx          context.Context
	client       cl.Client
	clusterScret *corev1.Secret
	config       cloud.Config
}

func NewRegisterAndStartData(ctx context.Context, client cl.Client, clusterScret *corev1.Secret, config cloud.Config) RegisterAndStartData {
	return RegisterAndStartData{
		ctx:          ctx,
		client:       client,
		clusterScret: clusterScret,
		config:       config,
	}
}

// ----------------------------------------------------------------------------------------------------------//

type RegisterAndStartCallBack func(data RegisterAndStartData) *cloud.ErrorMgr

func RetryRegisterAndStart(logger logr.Logger, maxRetries int, data RegisterAndStartData, callback RegisterAndStartCallBack) *cloud.ErrorMgr {
	for i := 0; i < maxRetries; i++ {
		err := callback(data)
		if err == nil {
			return nil
		}
		logger.Error(err.Concat(": "), "failed to RegisterAndStart,retrying after 5s...")
		time.Sleep(5 * time.Second)
	}

	return cloud.NewErrorMgr("RetryRegisterAndStart", "Time out")
}

func RegisterAndStart(data RegisterAndStartData) *cloud.ErrorMgr {
	value, ok := data.clusterScret.Labels["registered"]
	if !ok {
		return cloud.NewErrorMgr("RegisterAndStart", "the Yaml of cloud secret if error, less registered label")
	}
	if value != TRUE {
		em := data.Register()
		if em != nil {
			return cloud.LoadError("RegisterAndStart", em)
		}
	}
	em := data.StartCloudModule()
	if em != nil {
		return cloud.LoadError("RegisterAndStart", em)
	}
	return nil
}

func (rd *RegisterAndStartData) Register() *cloud.ErrorMgr {
	url := rd.config.RegisterURL
	httpbody, em := cloud.CommunicateWithCloud("GET", url, nil)
	if em != nil {
		return cloud.LoadError("Register", em)
	}
	if !cloud.IsSuccessfulStatusCode(httpbody.StatusCode) {
		return cloud.NewErrorMgr("Register", http.StatusText(httpbody.StatusCode))
	}
	var clusterInfo cloud.ClusterInfo
	em = cloud.Convert(httpbody.Body, &clusterInfo)
	if em != nil {
		return cloud.LoadError("Register", em)
	}
	if rd.clusterScret.Data == nil {
		rd.clusterScret.Data = make(map[string][]byte)
	}
	rd.clusterScret.Data["token"] = []byte(clusterInfo.License.Token)
	rd.clusterScret.Data["key"] = []byte(clusterInfo.License.PublicKey)
	rd.clusterScret.Data["uid"] = []byte(clusterInfo.UID)
	err := rd.client.Update(rd.ctx, rd.clusterScret)
	if err != nil {
		return cloud.NewErrorMgr("Register", "client.Update", err.Error())
	}
	return nil
}

func (rd *RegisterAndStartData) StartCloudModule() *cloud.ErrorMgr {
	if !rd.submitLicense(time.Now().Add(time.Minute).Unix()) {
		return cloud.NewErrorMgr("StartCloudModule", "SubmitLicense", "failed to submit license")
	}

	if em := rd.startCloudClient(); em != nil {
		return cloud.LoadError("startCloudClient", em)
	}
	return nil
}

func (rd *RegisterAndStartData) submitLicense(expire int64) bool {
	return SubmitLicense(rd.ctx, rd.client, *rd.clusterScret, expire) == nil
}

func (rd *RegisterAndStartData) startCloudClient() *cloud.ErrorMgr {
	var startInstance cloudv1.CloudClient
	startInstance.SetName(cloud.ClientStartName)
	startInstance.SetNamespace(cloud.Namespace)
	if err := rd.client.Get(rd.ctx, types.NamespacedName{Namespace: cloud.Namespace, Name: cloud.ClientStartName}, &startInstance); err != nil {
		if apierrors.IsNotFound(err) {
			startInstance.Labels = make(map[string]string)
			startInstance.Labels["isRead"] = FALSE
			if err := rd.client.Create(rd.ctx, &startInstance); err != nil {
				return cloud.NewErrorMgr("startCloudClient", "client.Create", err.Error())
			}
		} else {
			return cloud.NewErrorMgr("startCloudClient", "client.Get", err.Error())
		}
	} else {
		if startInstance.Labels == nil {
			startInstance.Labels = make(map[string]string)
		}
		startInstance.Labels["isRead"] = FALSE
		if err := rd.client.Update(rd.ctx, &startInstance); err != nil {
			return cloud.NewErrorMgr("startCloudClient", "client.Update", err.Error())
		}
	}
	time.Sleep(time.Millisecond * 1000)
	if startInstance.Labels == nil {
		startInstance.Labels = make(map[string]string)
	}
	startInstance.Labels["isRead"] = TRUE
	if err := rd.client.Update(rd.ctx, &startInstance); err != nil {
		return cloud.NewErrorMgr("startCloudClient", "client.Update", err.Error())
	}
	return nil
}

func SubmitLicense(ctx context.Context, client cl.Client, cluster corev1.Secret, expire int64) *cloud.ErrorMgr {
	for {
		var license cloudv1.License
		if time.Now().Unix() > expire {
			return cloud.NewErrorMgr("SubmitLicense", "Time Out")
		}
		err := client.Get(ctx, types.NamespacedName{Namespace: cloud.Namespace, Name: cloud.LicenseName}, &license)
		if err != nil {
			if apierrors.IsNotFound(err) {
				license.SetName(cloud.LicenseName)
				license.SetNamespace(cloud.Namespace)
				license.Spec.Token = string(cluster.Data["token"])
				license.Spec.Key = string(cluster.Data["key"])
				if license.Labels == nil {
					license.Labels = make(map[string]string)
				}
				license.Labels["isRead"] = FALSE
				err := client.Create(ctx, &license)
				if err == nil {
					return nil
				}
			}
		} else {
			license.SetName(cloud.LicenseName)
			license.SetNamespace(cloud.Namespace)
			license.Spec.Token = string(cluster.Data["token"])
			license.Spec.Key = string(cluster.Data["key"])
			if license.Labels == nil {
				license.Labels = make(map[string]string)
			}
			license.Labels["isRead"] = FALSE
			err := client.Update(ctx, &license)
			if err == nil {
				return nil
			}
		}
		time.Sleep(time.Second * 3)
	}
}
