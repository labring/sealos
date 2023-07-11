package launch

import (
	"context"
	"crypto/rand"
	"fmt"
	"os"

	corev1 "k8s.io/api/core/v1"
	apierrors "k8s.io/apimachinery/pkg/api/errors"
	"sigs.k8s.io/controller-runtime/pkg/client"
)

const ClusterInfo = "ClusterInfo"

// type ClusterInfo struct {
// 	Tenant string `json:"temant"`
// 	UUID   string `json:"uuid"`
// }

func Launcher(ctx context.Context, client client.Client) error {
	tenant := os.Getenv("TENANTID")
	uuid, err := newUUID()
	if err != nil {
		return err
	}
	var secret corev1.Secret
	secret.SetName(ClusterInfo)
	secret.Data = make(map[string][]byte)
	secret.Labels = make(map[string]string)
	secret.Labels["isRegistered"] = "false"
	secret.Data["tenant"] = []byte(tenant)
	secret.Data["uuid"] = []byte(uuid)
	err = client.Create(ctx, &secret)
	if err != nil {
		if apierrors.IsAlreadyExists(err) {
			return nil
		}
		return err
	}
	return nil
}

func newUUID() (string, error) {
	uuid := make([]byte, 16)
	n, err := rand.Read(uuid)
	if n != len(uuid) || err != nil {
		return "", err
	}
	uuid[6] = (uuid[6] & 0x0f) | 0x40
	uuid[8] = (uuid[8] & 0x3f) | 0x80
	return fmt.Sprintf("%x-%x-%x-%x-%x", uuid[0:4], uuid[4:6], uuid[6:8], uuid[8:10], uuid[10:]), nil
}
