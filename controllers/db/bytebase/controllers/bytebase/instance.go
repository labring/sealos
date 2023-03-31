package bytebase

import (
	"context"
	"fmt"
	"strconv"

	api "github.com/labring/sealos/controllers/db/bytebase/client/api"
	acidv1 "github.com/zalando/postgres-operator/pkg/apis/acid.zalan.do/v1"
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
	if err := r.syncPostgresInstance(ctx, req); err != nil {
		errorMessage := "failed to set up postgres instance"
		logger.Error(err, errorMessage)
		return err
	}
	return nil
}

func (r *Reconciler) syncPostgresInstance(ctx context.Context, req ctrl.Request) error {
	// logger := r.Logger
	logger := log.FromContext(ctx, "bytebase", req.NamespacedName)
	c := r.Bc
	var (
		dataSourceType       api.DataSourceType
		dataSourceUserName   string
		dataSourceUserPasswd string
		dataSourceHost       string
		dataSourcePort       string
	)
	dataSourceType = defaultDataSourceType
	pgInstanceList := acidv1.PostgresqlList{}
	if err := r.List(ctx, &pgInstanceList, client.InNamespace(req.Namespace)); err != nil {
		logger.Error(err, "failed to get postgresql instance. Make sure postgresql instances are running")
		return err
	}
	logger.Info("ready to initialize database...")

	for _, instance := range pgInstanceList.Items {
		instanceName := instance.ObjectMeta.Name
		// get database service
		svc := corev1.Service{}

		svcName := instanceName
		if err := r.Get(ctx, client.ObjectKey{
			Namespace: req.Namespace,
			Name:      svcName,
		}, &svc); err != nil {
			logger.Error(err, "failed to get postgresql service")
			return err
		}

		dataSourceHost = svc.Spec.ClusterIP
		// dataSourceHost = "192.168.2.29" // for testing
		ports := svc.Spec.Ports
		for _, p := range ports {
			if p.Name == "postgresql" {
				dataSourcePort = strconv.FormatInt(int64(p.Port), 10)
				break
			}
		}
		environmentID := defaultEnvironmentID

		// dataSourcePort = strconv.FormatInt(30009, 10) // for testing
		ifm := api.InstanceFindMessage{
			EnvironmentID: environmentID,
			InstanceID:    instanceName,
			ShowDeleted:   false,
		}
		logger.Info("try to fetch instance...")
		if _, err := c.GetInstance(ctx, &ifm); err == nil {
			logger.Info("fetch instance success, skipping...")
			continue
		}

		dataSourceMessages := []*api.DataSourceMessage{}

		// get database credentials

		databasesWithUser := instance.Spec.Databases

		for database, username := range databasesWithUser {
			secret := corev1.Secret{}
			secretName := fmt.Sprintf("%s.%s.credentials.postgresql.acid.zalan.do", username, instanceName)
			if err := r.Get(ctx, client.ObjectKey{
				Namespace: req.Namespace,
				Name:      secretName,
			}, &secret); err != nil {
				logger.Error(err, "failed to fetch database credentials")
				return err
			}

			dataSourceUserName = string(secret.Data["username"])
			dataSourceUserPasswd = string(secret.Data["password"])
			dsm := api.DataSourceMessage{
				Title:    database,
				Type:     dataSourceType,
				Username: dataSourceUserName,
				Password: dataSourceUserPasswd,
				Host:     dataSourceHost,
				Port:     dataSourcePort,
				Database: database,
			}
			dataSourceMessages = append(dataSourceMessages, &dsm)
		}

		// register instances to bytebase

		im := api.InstanceMessage{
			UID:         instanceName,
			Name:        instanceName,
			Engine:      api.EngineTypePostgres,
			DataSources: dataSourceMessages,
			Title:       instanceName,
		}
		logger.Info("the instance doesn't exists, try to create one...")

		if _, err := c.CreateInstance(ctx, environmentID, instanceName, &im); err != nil {
			logger.Error(err, "failed to add an instance.")
			return err
		}
	}
	return nil
}
