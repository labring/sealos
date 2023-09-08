// Copyright © 2023 sealos.
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

package bytebase

import (
	"context"
	"fmt"

	api "github.com/labring/sealos/controllers/db/bytebase/client/api"
	corev1 "k8s.io/api/core/v1"
	ctrl "sigs.k8s.io/controller-runtime"
	"sigs.k8s.io/controller-runtime/pkg/client"
	"sigs.k8s.io/controller-runtime/pkg/log"
)

const (
	defaultEnvironmentID  string             = "prod"
	defaultDataSourceType api.DataSourceType = "ADMIN"
)

func (r *Reconciler) syncInstance(ctx context.Context, req ctrl.Request) error {
	c := r.Bc
	// logger := r.Logger
	logger := log.FromContext(ctx, "bytebase", req.NamespacedName)
	/// check the default environment exists
	if _, err := c.GetEnvironment(ctx, defaultEnvironmentID); err != nil {
		errorMessage := "failed to get the default environment. No environment to set up instances at this time"
		logger.Error(err, errorMessage)
		return err
	}
	if err := r.syncKbCluster(ctx, req); err != nil {
		errorMessage := "failed to set up kubeblocks instance"
		logger.Error(err, errorMessage)
		return err
	}
	return nil
}

const (
	ManagedByLabel        string = "app.kubernetes.io/managed-by"
	InstanceLabel         string = "app.kubernetes.io/instance"
	ComponentLabel        string = "apps.kubeblocks.io/component-name"
	KbManagedByLabelValue string = "kubeblocks"
)

func (r *Reconciler) syncKbCluster(ctx context.Context, req ctrl.Request) error {
	logger := log.FromContext(ctx, "bytebase", req.NamespacedName)

	// Kubeblocks stores user connection credential under <clusterName>-conn-credential, should we provide a way to customize this?

	c := r.Bc
	var (
		dataSourceType       api.DataSourceType
		dataSourceUserName   string
		dataSourceUserPasswd string
		dataSourceHost       string
		dataSourcePort       string
	)
	dataSourceType = defaultDataSourceType

	environmentID := defaultEnvironmentID
	dbSvcList := corev1.ServiceList{}
	if err := r.List(context.Background(), &dbSvcList, client.MatchingLabels{ManagedByLabel: KbManagedByLabelValue}); err != nil {
		logger.Error(err, "failed to get kubeblocks database service")
		return err
	}
	for _, dbSvc := range dbSvcList.Items {
		componentName := dbSvc.Labels[ComponentLabel]
		var engineType api.EngineType
		if engineType = selectEngineType(componentName); engineType == "" {
			// unsupported component by bytebase
			continue
		}
		clusterName := dbSvc.Labels[InstanceLabel]
		// get the secret of the database cluster
		secret := corev1.Secret{}
		secretName := fmt.Sprintf("%s-conn-credential", clusterName)
		if err := r.Get(ctx, client.ObjectKey{
			Namespace: req.Namespace,
			Name:      secretName,
		}, &secret); err != nil {
			logger.Error(err, "failed to fetch cluster connection credentials")
			return err
		}
		logger.Info("got secret. initialize instance now.")
		dataSourceUserName = string(secret.Data["username"])
		dataSourceUserPasswd = string(secret.Data["password"])
		dataSourcePort = string(secret.Data["port"])
		dataSourceHost = string(secret.Data["host"])

		dataSourceMessages := []*api.DataSourceMessage{}
		dsm := api.DataSourceMessage{
			Title:    clusterName,
			Type:     dataSourceType,
			Username: dataSourceUserName,
			Password: dataSourceUserPasswd,
			Host:     dataSourceHost,
			Port:     dataSourcePort,
			Database: clusterName,
		}
		dataSourceMessages = append(dataSourceMessages, &dsm)

		// register instances to bytebase
		im := api.InstanceMessage{
			UID:         clusterName,
			Name:        clusterName,
			Engine:      engineType,
			DataSources: dataSourceMessages,
			Title:       clusterName,
		}
		logger.Info("the instance doesn't exists, try to create one...")

		if _, err := c.CreateInstance(ctx, environmentID, clusterName, &im); err != nil {
			logger.Error(err, "failed to add an instance.")
			return err
		}
	}
	return nil
}

func selectEngineType(componentName string) api.EngineType {
	switch componentName {
	case "mysql":
		return api.EngineTypeMySQL
	case "postgresql":
		return api.EngineTypePostgres
	case "mongodb":
		return api.EngineTypeMongoDB
	case "mongos":
		return api.EngineTypeMongoDB
	default:
		return ""
	}
}
