package dao

import (
	"context"
	"errors"
	"fmt"
	"time"

	"github.com/labring/sealos/controllers/pkg/types"
	"gorm.io/gorm"
	corev1 "k8s.io/api/core/v1"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/client-go/kubernetes"
	"k8s.io/client-go/rest"
)

type FlushQuotaTask struct {
	LocalDomain string
}

func (a *FlushQuotaTask) Execute() error {
	config, err := rest.InClusterConfig()
	if err != nil {
		return fmt.Errorf("get in cluster config failed: %w", err)
	}
	clientset, err := kubernetes.NewForConfig(config)
	if err != nil {
		return fmt.Errorf("new client set failed: %w", err)
	}
	err = DBClient.GetGlobalDB().Transaction(func(tx *gorm.DB) error {
		var tasks []types.AccountRegionUserTask
		err := tx.Where("start_at < ? AND region_domain = ? AND type = ? AND status = ?", time.Now().UTC(), a.LocalDomain, types.AccountRegionUserTaskTypeFlushQuota, types.AccountRegionUserTaskStatusPending).
			Find(&tasks).
			Error
		if err != nil {
			return err
		}
		fmt.Printf("FlushQuotaTask found %d tasks\n", len(tasks))
		for _, task := range tasks {
			crName, err := DBClient.GetUserCrName(types.UserQueryOpts{UID: task.UserUID})
			if err != nil && !errors.Is(err, gorm.ErrRecordNotFound) {
				return fmt.Errorf("get user cr name failed: %w", err)
			}
			if crName != "" {
				nsList, err := getOwnNsList(clientset, crName)
				if err != nil {
					return fmt.Errorf("get own namespace list failed: %w", err)
				}
				userSub, err := DBClient.GetSubscription(&types.UserQueryOpts{UID: task.UserUID})
				if err != nil {
					return fmt.Errorf("get user subscription failed: %w", err)
				}
				for _, ns := range nsList {
					quota := getDefaultResourceQuota(
						ns,
						"quota-"+ns,
						SubPlanResourceQuota[userSub.PlanName],
					)
					err = Retry(10, time.Second, func() error {
						_, err := clientset.CoreV1().
							ResourceQuotas(ns).
							Update(context.Background(), quota, metav1.UpdateOptions{})
						if err != nil {
							return fmt.Errorf("failed to update resource quota for %s: %w", ns, err)
						}
						return nil
					})
					if err != nil {
						return fmt.Errorf("update resource quota failed: %w", err)
					}
				}
			}
			err = tx.Model(&task).
				Where(&types.AccountRegionUserTask{RegionDomain: a.LocalDomain, Type: types.AccountRegionUserTaskTypeFlushQuota, UserUID: task.UserUID, Status: types.AccountRegionUserTaskStatusPending}).
				Update("status", types.AccountRegionUserTaskStatusCompleted).
				Error
			if err != nil {
				return fmt.Errorf("update task status failed: %w", err)
			}
		}
		return nil
	})
	fmt.Printf("FlushQuotaTask executed: %v\n", err)
	return err
}

func Retry(attempts int, sleep time.Duration, f func() error) error {
	var err error
	for range attempts {
		err = f()
		if err == nil {
			return nil
		}
		time.Sleep(sleep)
	}
	return err
}

// getOwnNsWith *kubernetes.Clientset
func getOwnNsList(clientset *kubernetes.Clientset, user string) ([]string, error) {
	if user == "" {
		return nil, errors.New("user is empty")
	}
	nsList, err := clientset.CoreV1().
		Namespaces().
		List(context.Background(), metav1.ListOptions{LabelSelector: fmt.Sprintf("%s=%s", "user.sealos.io/owner", user)})
	if err != nil {
		return nil, fmt.Errorf("list namespace failed: %w", err)
	}
	nsListStr := make([]string, len(nsList.Items))
	for i := range nsList.Items {
		nsListStr[i] = nsList.Items[i].Name
	}
	return nsListStr, nil
}

func getDefaultResourceQuota(ns, name string, hard corev1.ResourceList) *corev1.ResourceQuota {
	return &corev1.ResourceQuota{
		ObjectMeta: metav1.ObjectMeta{
			Name:      name,
			Namespace: ns,
		},
		Spec: corev1.ResourceQuotaSpec{
			Hard: hard,
		},
	}
}
