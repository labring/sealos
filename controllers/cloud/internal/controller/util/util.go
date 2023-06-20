package util

import (
	"context"
	"encoding/json"
	"errors"
	"os"
	"reflect"

	cloud "github.com/labring/sealos/controllers/cloud/internal/cloudtool"
	"github.com/labring/sealos/pkg/utils/logger"
	corev1 "k8s.io/api/core/v1"
	"k8s.io/apimachinery/pkg/types"
	cl "sigs.k8s.io/controller-runtime/pkg/client"
)

type Config struct {
	CollectorURL    string `json:"CollectorURL"`
	NotificationURL string `json:"NotificationURL"`
	RegisterURL     string `json:"RegisterURL"`
	CloudSyncURL    string `json:"CloudSyncURL"`
	// Add other fields here to support future expansion needs.
}

func ReadConfigFile(filepath string) (Config, error) {
	data, err := os.ReadFile(filepath)
	if err != nil {
		logger.Error("failed to read config file:", err)
		return Config{}, err
	}

	var config Config
	err = json.Unmarshal(data, &config)
	if err != nil {
		logger.Error("failed to parse config file:", err)
		return Config{}, err
	}

	return config, nil
}

func SetField(obj interface{}, client interface{}, fieldName string) error {
	v := reflect.ValueOf(obj).Elem()
	field := v.FieldByName(fieldName)
	if field.IsValid() && field.CanSet() {
		field.Set(reflect.ValueOf(client))
		return nil
	}
	return errors.New("invalid or unexported client field")
}

func GetUID(client cl.Client) (string, error) {
	var clusterUIDSecret corev1.Secret

	secretName := cloud.SecretName
	secretNamespace := cloud.Namespace

	ctx := context.Background()

	if err := client.Get(ctx, types.NamespacedName{Name: secretName, Namespace: secretNamespace}, &clusterUIDSecret); err != nil {
		logger.Error("failed to get uid secret", err)
		return "", err
	}
	uidBytes, ok := clusterUIDSecret.Data["uid"]
	if !ok {
		logger.Error("uid not found", "failed to get uid from Secret")
		return "", errors.New("failed to get uid from secret: uid not found")
	}

	uid := string(uidBytes)
	return uid, nil
}

func GetToken(client cl.Client) (string, error) {
	var clusterTokenSecret corev1.Secret

	ctx := context.Background()

	if err := client.Get(ctx, types.NamespacedName{Name: cloud.SecretName, Namespace: cloud.Namespace}, &clusterTokenSecret); err != nil {
		logger.Error("failed to get token secret", err)
		return "", err
	}
	uidBytes, ok := clusterTokenSecret.Data["token"]
	if !ok {
		logger.Error("uid not found", "failed to get token from Secret")
		return "", errors.New("failed to get token from secret: token not found")
	}

	uid := string(uidBytes)
	return uid, nil
}

func UpdateToken(client cl.Client, token string) error {
	var clusterTokenSecret corev1.Secret
	clusterTokenSecret.Data = make(map[string][]byte)

	clusterTokenSecret.SetName(cloud.SecretName)
	clusterTokenSecret.SetNamespace(cloud.Namespace)
	clusterTokenSecret.Data["token"] = []byte(token)
	ctx := context.Background()

	if err := client.Update(ctx, &clusterTokenSecret); err != nil {
		logger.Error("failed to update token secret", err)
		return err
	}

	return nil
}

func UpdatePublicKey(client cl.Client, publicKey string) error {
	var clusterTokenSecret corev1.Secret
	clusterTokenSecret.Data = make(map[string][]byte)

	clusterTokenSecret.SetName(cloud.SecretName)
	clusterTokenSecret.SetNamespace(cloud.Namespace)
	clusterTokenSecret.Data["publicKey"] = []byte(publicKey)
	ctx := context.Background()

	if err := client.Update(ctx, &clusterTokenSecret); err != nil {
		logger.Error("failed to update publicKey secret", err)
		return err
	}

	return nil
}
