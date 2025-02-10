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

package controllers

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"math"
	"os"
	"sort"
	"strconv"
	"strings"
	"time"

	"go.mongodb.org/mongo-driver/bson/primitive"

	"github.com/google/uuid"

	gonanoid "github.com/matoous/go-nanoid/v2"

	"gorm.io/gorm"

	"k8s.io/client-go/rest"

	"k8s.io/client-go/kubernetes"

	"github.com/go-logr/logr"

	accountv1 "github.com/labring/sealos/controllers/account/api/v1"
	"github.com/labring/sealos/controllers/pkg/database"
	"github.com/labring/sealos/controllers/pkg/resources"
	pkgtypes "github.com/labring/sealos/controllers/pkg/types"
	"github.com/labring/sealos/controllers/pkg/utils/env"
	"github.com/labring/sealos/controllers/pkg/utils/retry"
	userv1 "github.com/labring/sealos/controllers/user/api/v1"

	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/runtime"
	ctrl "sigs.k8s.io/controller-runtime"
	"sigs.k8s.io/controller-runtime/pkg/builder"
	"sigs.k8s.io/controller-runtime/pkg/client"
	"sigs.k8s.io/controller-runtime/pkg/controller"
	"sigs.k8s.io/controller-runtime/pkg/controller/controllerutil"
)

type CVMTaskRunner struct {
	DBClient database.Interface
	Logger   logr.Logger
	*AccountReconciler
}

func (r *CVMTaskRunner) Start(ctx context.Context) error {
	ticker := time.NewTicker(env.GetDurationEnvWithDefault("BILLING_CVM_INTERVAL", 10*time.Minute))
	defer func() {
		ticker.Stop()
		r.Logger.Info("stop billing cvm")
	}()
	for {
		select {
		case <-ticker.C:
			r.Logger.Info("start billing cvm", "time", time.Now().Format(time.RFC3339))
			err := r.BillingCVM()
			if err != nil {
				r.Logger.Error(err, "fail to billing cvm")
			}
			r.Logger.Info("end billing cvm", "time", time.Now().Format(time.RFC3339))
		case <-ctx.Done():
			return nil
		}
	}
}

const (
	ACCOUNTNAMESPACEENV     = "ACCOUNT_NAMESPACE"
	DEFAULTACCOUNTNAMESPACE = "sealos-system"
	RECHARGEGIFT            = "recharge-gift"
	SEALOS                  = "sealos"
)

// AccountReconciler reconciles an Account object
type AccountReconciler struct {
	client.Client
	AccountV2              database.AccountV2
	Scheme                 *runtime.Scheme
	Logger                 logr.Logger
	AccountSystemNamespace string
	DBClient               database.Account
	CVMDBClient            database.CVM
	MongoDBURI             string
	Activities             pkgtypes.Activities
	DefaultDiscount        pkgtypes.RechargeDiscount
}

//+kubebuilder:rbac:groups=account.sealos.io,resources=accounts,verbs=get;list;watch;create;update;patch;delete
//+kubebuilder:rbac:groups=account.sealos.io,resources=accounts/status,verbs=get;update;patch
//+kubebuilder:rbac:groups=account.sealos.io,resources=accounts/finalizers,verbs=update
//+kubebuilder:rbac:groups=core,resources=resourcequotas,verbs=get;list;watch;create;update;patch;delete
//+kubebuilder:rbac:groups=core,resources=limitranges,verbs=get;list;watch;create;update;patch;delete
//+kubebuilder:rbac:groups=user.sealos.io,resources=users,verbs=create;get;list;watch
//+kubebuilder:rbac:groups=rbac.authorization.k8s.io,resources=rolebindings,verbs=get;list;watch;create;update;patch;delete
//+kubebuilder:rbac:groups=rbac.authorization.k8s.io,resources=roles,verbs=get;list;watch;create;update;patch;delete
//+kubebuilder:rbac:groups="",resources=configmaps,verbs=get;list;watch;create;update;patch;delete

func (r *AccountReconciler) Reconcile(ctx context.Context, req ctrl.Request) (ctrl.Result, error) {
	user := &userv1.User{}
	owner := ""
	if err := r.Get(ctx, client.ObjectKey{Namespace: req.Namespace, Name: req.Name}, user); err == nil {
		if owner = user.Annotations[userv1.UserAnnotationOwnerKey]; owner == "" {
			return ctrl.Result{}, fmt.Errorf("user owner is empty")
		}
		// This is only used to monitor and initialize user resource creation data,
		// determine the resource quota created by the owner user and the resource quota initialized by the account user,
		// and only the resource quota created by the team user
		_, err = r.syncAccount(ctx, owner, "ns-"+user.Name)
		if errors.Is(err, gorm.ErrRecordNotFound) && user.CreationTimestamp.Add(20*24*time.Hour).Before(time.Now()) {
			return ctrl.Result{}, nil
		}
		return ctrl.Result{}, err
	} else if client.IgnoreNotFound(err) != nil {
		return ctrl.Result{}, err
	}

	return ctrl.Result{}, nil
}

func (r *AccountReconciler) syncAccount(ctx context.Context, owner string, userNamespace string) (*pkgtypes.Account, error) {
	if err := r.syncResourceQuotaAndLimitRange(ctx, userNamespace); err != nil {
		r.Logger.Error(err, "sync resource resourceQuota and limitRange failed")
	}
	//if err := r.adaptEphemeralStorageLimitRange(ctx, userNamespace); err != nil {
	//	r.Logger.Error(err, "adapt ephemeral storage limitRange failed")
	//}
	if getUsername(userNamespace) != owner {
		return nil, nil
	}
	account, err := r.AccountV2.NewAccount(&pkgtypes.UserQueryOpts{Owner: owner})
	if err != nil {
		return nil, err
	}
	return account, nil
}

func (r *AccountReconciler) syncResourceQuotaAndLimitRange(ctx context.Context, nsName string) error {
	objs := []client.Object{client.Object(resources.GetDefaultLimitRange(nsName, nsName)), client.Object(resources.GetDefaultResourceQuota(nsName, ResourceQuotaPrefix+nsName))}
	for i := range objs {
		err := retry.Retry(10, 1*time.Second, func() error {
			_, err := controllerutil.CreateOrUpdate(ctx, r.Client, objs[i], func() error {
				return nil
			})
			return err
		})
		if err != nil {
			return fmt.Errorf("sync resource %T failed: %v", objs[i], err)
		}
	}
	return nil
}

//func (r *AccountReconciler) adaptEphemeralStorageLimitRange(ctx context.Context, nsName string) error {
//	limit := resources.GetDefaultLimitRange(nsName, nsName)
//	return retry.Retry(10, 1*time.Second, func() error {
//		_, err := controllerutil.CreateOrUpdate(ctx, r.Client, limit, func() error {
//			if len(limit.Spec.Limits) == 0 {
//				limit = resources.GetDefaultLimitRange(nsName, nsName)
//			}
//			limit.Spec.Limits[0].DefaultRequest[corev1.ResourceEphemeralStorage] = resources.LimitRangeDefault[corev1.ResourceEphemeralStorage]
//			limit.Spec.Limits[0].Default[corev1.ResourceEphemeralStorage] = resources.LimitRangeDefault[corev1.ResourceEphemeralStorage]
//			//if _, ok := limit.Spec.Limits[0].Default[corev1.ResourceEphemeralStorage]; !ok {
//			//}
//			return nil
//		})
//		return err
//	})
//}

// SetupWithManager sets up the controller with the Manager.
func (r *AccountReconciler) SetupWithManager(mgr ctrl.Manager, rateOpts controller.Options) error {
	r.Logger = ctrl.Log.WithName("account_controller")
	r.AccountSystemNamespace = env.GetEnvWithDefault(ACCOUNTNAMESPACEENV, DEFAULTACCOUNTNAMESPACE)
	return ctrl.NewControllerManagedBy(mgr).
		For(&userv1.User{}, builder.WithPredicates(OnlyCreatePredicate{})).
		WithOptions(rateOpts).
		Complete(r)
}

func RawParseRechargeConfig() (activities pkgtypes.Activities, discountsteps []int64, discountratios []float64, returnErr error) {
	// local test
	//config, err := clientcmd.BuildConfigFromFlags("", os.Getenv("KUBECONFIG"))
	//if err != nil {
	//	fmt.Printf("Error building kubeconfig: %v\n", err)
	//	os.Exit(1)
	//}
	config, err := rest.InClusterConfig()
	if err != nil {
		returnErr = fmt.Errorf("get in cluster config failed: %v", err)
		return
	}
	clientset, err := kubernetes.NewForConfig(config)
	if err != nil {
		returnErr = fmt.Errorf("get clientset failed: %v", err)
		return
	}
	configMap, err := clientset.CoreV1().ConfigMaps(SEALOS).Get(context.TODO(), RECHARGEGIFT, metav1.GetOptions{})
	if err != nil {
		returnErr = fmt.Errorf("get configmap failed: %v", err)
		return
	}
	if returnErr = parseConfigList(configMap.Data["steps"], &discountsteps, "steps"); returnErr != nil {
		return
	}

	if returnErr = parseConfigList(configMap.Data["ratios"], &discountratios, "ratios"); returnErr != nil {
		return
	}

	if activityStr := configMap.Data["activities"]; activityStr != "" {
		returnErr = json.Unmarshal([]byte(activityStr), &activities)
	}
	return
}

func parseConfigList(s string, list interface{}, configName string) error {
	for _, v := range strings.Split(s, ",") {
		switch list := list.(type) {
		case *[]int64:
			i, err := strconv.ParseInt(v, 10, 64)
			if err != nil {
				return fmt.Errorf("%s format error: %v", configName, err)
			}
			*list = append(*list, i)
		case *[]float64:
			f, err := strconv.ParseFloat(v, 64)
			if err != nil {
				return fmt.Errorf("%s format error: %v", configName, err)
			}
			*list = append(*list, f)
		}
	}
	return nil
}

const BaseUnit = 1_000_000

func getAmountWithDiscount(amount int64, discount pkgtypes.UserRechargeDiscount) int64 {
	var r float64
	for _, step := range sortSteps(discount.DefaultSteps) {
		ratio := discount.DefaultSteps[step]
		if amount >= step*BaseUnit {
			r = ratio
		} else {
			break
		}
	}
	return int64(math.Ceil(float64(amount) * r / 100))
}

func sortSteps(steps map[int64]float64) (keys []int64) {
	for k := range steps {
		keys = append(keys, k)
	}
	sort.Slice(keys, func(i, j int) bool {
		return keys[i] < keys[j]
	})
	return
}

func getFirstRechargeDiscount(amount int64, discount pkgtypes.UserRechargeDiscount) (bool, int64) {
	if discount.FirstRechargeSteps != nil && discount.FirstRechargeSteps[amount/BaseUnit] != 0 {
		return true, int64(math.Ceil(float64(amount) * discount.FirstRechargeSteps[amount/BaseUnit] / 100))
	}
	return false, getAmountWithDiscount(amount, discount)
}

func (r *AccountReconciler) BillingCVM() error {
	cvmMap, err := r.CVMDBClient.GetPendingStateInstance(os.Getenv("LOCAL_REGION"))
	if err != nil {
		return fmt.Errorf("get pending state instance failed: %v", err)
	}
	for userUID, cvms := range cvmMap {
		fmt.Println("billing cvm", userUID, cvms)
		//userUID, namespace := strings.Split(userInfo, "/")[0], strings.Split(userInfo, "/")[1]
		appCosts := make([]resources.AppCost, len(cvms))
		cvmTotalAmount := 0.0
		cvmIDs := make([]primitive.ObjectID, len(cvms))
		cvmIDsDetail := make([]string, 0)
		for i := range cvms {
			appCosts[i] = resources.AppCost{
				Amount: int64(cvms[i].Amount * BaseUnit),
				Name:   cvms[i].InstanceName,
			}
			cvmTotalAmount += cvms[i].Amount
			cvmIDs[i] = cvms[i].ID
			cvmIDsDetail = append(cvmIDsDetail, cvms[i].ID.String())
		}
		userQueryOpts := pkgtypes.UserQueryOpts{UID: uuid.MustParse(userUID)}
		user, err := r.AccountV2.GetUserCr(&userQueryOpts)
		if err != nil {
			if err == gorm.ErrRecordNotFound {
				fmt.Println("user not found", userQueryOpts)
				continue
			}
			return fmt.Errorf("get user failed: %v", err)
		}
		id, err := gonanoid.New(12)
		if err != nil {
			return fmt.Errorf("generate billing id error: %v", err)
		}
		billing := &resources.Billing{
			OrderID:   id,
			AppCosts:  appCosts,
			Type:      accountv1.Consumption,
			Namespace: "ns-" + user.CrName,
			AppType:   resources.AppType[resources.CVM],
			Amount:    int64(cvmTotalAmount * BaseUnit),
			Owner:     user.CrName,
			Time:      time.Now().UTC(),
			Status:    resources.Settled,
			Detail:    "{" + strings.Join(cvmIDsDetail, ",") + "}",
		}
		err = r.AccountV2.AddDeductionBalanceWithFunc(&pkgtypes.UserQueryOpts{UID: user.UserUID}, billing.Amount, func() error {
			if saveErr := r.DBClient.SaveBillings(billing); saveErr != nil {
				return fmt.Errorf("save billing failed: %v", saveErr)
			}
			return nil
		}, func() error {
			if saveErr := r.CVMDBClient.SetDoneStateInstance(cvmIDs...); saveErr != nil {
				return fmt.Errorf("set done state instance failed: %v", saveErr)
			}
			return nil
		})
		if err != nil {
			return fmt.Errorf("add balance failed: %v", err)
		}
		fmt.Printf("billing cvm success %#+v\n", billing)
	}
	return nil
}
