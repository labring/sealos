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
	"os"
	"strconv"
	"strings"
	"time"

	"github.com/go-logr/logr"
	"github.com/google/uuid"
	accountv1 "github.com/labring/sealos/controllers/account/api/v1"
	"github.com/labring/sealos/controllers/pkg/database"
	"github.com/labring/sealos/controllers/pkg/resources"
	pkgtypes "github.com/labring/sealos/controllers/pkg/types"
	usernotify "github.com/labring/sealos/controllers/pkg/user_notify"
	"github.com/labring/sealos/controllers/pkg/utils"
	"github.com/labring/sealos/controllers/pkg/utils/env"
	"github.com/labring/sealos/controllers/pkg/utils/logger"
	"github.com/labring/sealos/controllers/pkg/utils/retry"
	userv1 "github.com/labring/sealos/controllers/user/api/v1"
	gonanoid "github.com/matoous/go-nanoid/v2"
	"github.com/sirupsen/logrus"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"gorm.io/gorm"
	corev1 "k8s.io/api/core/v1"
	apierrors "k8s.io/apimachinery/pkg/api/errors"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/runtime"
	"k8s.io/client-go/kubernetes"
	"k8s.io/client-go/rest"
	ctrl "sigs.k8s.io/controller-runtime"
	"sigs.k8s.io/controller-runtime/pkg/builder"
	"sigs.k8s.io/controller-runtime/pkg/client"
	"sigs.k8s.io/controller-runtime/pkg/controller"
	"sigs.k8s.io/controller-runtime/pkg/controller/controllerutil"
	"sigs.k8s.io/controller-runtime/pkg/event"
	"sigs.k8s.io/controller-runtime/pkg/predicate"
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

	EnvNonFreeTrialEnabled = "NON_FREE_TRIAL_ENABLED"
	EnvJwtSecret           = "ACCOUNT_API_JWT_SECRET"
	EnvDesktopJwtSecret    = "DESKTOP_API_JWT_SECRET"

	InitAccountTimeAnnotation   = "user.sealos.io/init-account-time"
	WorkspaceStatusAnnotation   = "user.sealos.io/workspace-status"
	WorkspaceStatusSubscription = "subscription"
	WorkspaceStatusPAYG         = "payg"
)

var SubscriptionEnabled = false

// AccountReconciler reconciles an Account object
type AccountReconciler struct {
	client.Client
	AccountV2                      database.AccountV2
	InitUserAccountFunc            func(user *pkgtypes.UserQueryOpts) (*pkgtypes.Account, error)
	Scheme                         *runtime.Scheme
	Logger                         logr.Logger
	VLogger                        *logger.Logger
	accountSystemNamespace         string
	DBClient                       database.Account
	CVMDBClient                    database.CVM
	MongoDBURI                     string
	Activities                     pkgtypes.Activities
	DefaultDiscount                pkgtypes.RechargeDiscount
	SubscriptionQuotaLimit         map[string]corev1.ResourceList
	SyncNSQuotaFunc                func(ctx context.Context, owner, nsName string) error
	SkipExpiredUserTimeDuration    time.Duration
	localDomain                    string
	allRegionDomain                []string
	jwtManager                     *utils.JWTManager
	desktopJwtManager              *utils.JWTManager
	workspaceSubPlans              []pkgtypes.WorkspaceSubscriptionPlan
	workspaceSubPlansResourceLimit map[string]corev1.ResourceList

	UserContactProvider     usernotify.UserContactProvider
	UserNotificationService usernotify.EventNotificationService
	NonSupportFreeTrial     bool
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
	if err := r.Get(ctx, client.ObjectKey{Namespace: req.Namespace, Name: req.Name}, user); err == nil {
		if owner := user.Annotations[userv1.UserAnnotationOwnerKey]; owner == "" {
			return ctrl.Result{}, errors.New("user owner is empty")
		}
		if user.Annotations[InitAccountTimeAnnotation] != "" {
			return ctrl.Result{}, nil
		}
		// This is only used to monitor and initialize user resource creation data,
		// determine the resource quota created by the owner user and the resource quota initialized by the account user,
		// and only the resource quota created by the team user
		_, err = r.syncAccount(ctx, user)
		if errors.Is(err, gorm.ErrRecordNotFound) &&
			user.CreationTimestamp.Add(r.SkipExpiredUserTimeDuration).Before(time.Now()) {
			return ctrl.Result{}, nil
		}
		if err == nil {
			user.Annotations[InitAccountTimeAnnotation] = time.Now().Format(time.RFC3339)
			return ctrl.Result{}, r.Update(ctx, user)
		}
		return ctrl.Result{}, err
	} else if client.IgnoreNotFound(err) != nil {
		return ctrl.Result{}, err
	}

	return ctrl.Result{}, nil
}

func (r *AccountReconciler) syncAccount(
	ctx context.Context,
	userCr *userv1.User,
) (account *pkgtypes.Account, err error) {
	owner := userCr.Annotations[userv1.UserAnnotationOwnerKey]
	userNamespace := "ns-" + userCr.Name
	// if err := r.adaptEphemeralStorageLimitRange(ctx, userNamespace); err != nil {
	//	r.Logger.Error(err, "adapt ephemeral storage limitRange failed")
	//}
	user, err := r.AccountV2.GetUser(&pkgtypes.UserQueryOpts{Owner: owner, IgnoreEmpty: true})
	if err != nil {
		return nil, err
	}
	if user == nil {
		return nil, gorm.ErrRecordNotFound
	}
	if getUsername(userNamespace) == owner {
		account, err = r.InitUserAccountFunc(&pkgtypes.UserQueryOpts{Owner: owner})
		if err != nil {
			return nil, err
		}
		if err := r.syncDebt(ctx, owner); err != nil {
			return nil, fmt.Errorf("sync user debt failed: %w", err)
		}
	}
	if userCr.Annotations != nil &&
		userCr.Annotations[WorkspaceStatusAnnotation] == WorkspaceStatusSubscription {
		if err := r.syncSubscriptionWorkspaceResourceQuotaAndLimitRange(ctx, user.UID, userNamespace); err != nil {
			return nil, fmt.Errorf(
				"sync subscription workspace resource quota and limit range failed: %w",
				err,
			)
		}
	} else {
		if err := r.syncResourceQuotaAndLimitRange(ctx, userNamespace); err != nil {
			return nil, fmt.Errorf("sync user namespace resource quota and limit range failed: %w", err)
		}
	}
	return account, err
}

func (r *AccountReconciler) syncDebt(ctx context.Context, owner string) error {
	userUID, err := r.AccountV2.GetUserUID(&pkgtypes.UserQueryOpts{Owner: owner})
	if err != nil {
		return fmt.Errorf("get userUID failed: %w", err)
	}
	var count int64
	err = r.AccountV2.GetGlobalDB().
		Model(&pkgtypes.Debt{}).
		Where("user_uid = ?", userUID).
		Count(&count).
		Error
	if err != nil {
		return fmt.Errorf("check user debt existence failed: %w", err)
	}
	if count <= 0 {
		createDebt, err := r.initializeDebt(ctx, owner, userUID)
		if err != nil {
			return fmt.Errorf("initialize user debt failed: %w", err)
		}
		if err = r.AccountV2.GetGlobalDB().Create(createDebt).Error; err != nil {
			return fmt.Errorf("create user debt failed: %w", err)
		}
	}
	return nil
}

func (r *AccountReconciler) initializeDebt(
	ctx context.Context,
	owner string,
	userUID uuid.UUID,
) (*pkgtypes.Debt, error) {
	debtCr := &accountv1.Debt{}
	err := r.Get(
		ctx,
		client.ObjectKey{Namespace: r.accountSystemNamespace, Name: "debt-" + owner},
		debtCr,
	)
	if err != nil {
		if !apierrors.IsNotFound(err) {
			return nil, fmt.Errorf("failed to get user debt from CR: %w", err)
		}
		return &pkgtypes.Debt{
			UserUID:           userUID,
			AccountDebtStatus: pkgtypes.NormalPeriod,
			CreatedAt:         time.Now().UTC(),
			UpdatedAt:         time.Now().UTC(),
		}, nil
	}

	return convertDebtCrToDebt(debtCr, userUID), nil
}

func convertDebtCrToDebt(debtCr *accountv1.Debt, userUID uuid.UUID) *pkgtypes.Debt {
	debt := &pkgtypes.Debt{
		UserUID:           userUID,
		AccountDebtStatus: convertDebtStatus(debtCr.Status.AccountDebtStatus),
		CreatedAt:         debtCr.CreationTimestamp.UTC(),
	}
	if debtCr.Status.LastUpdateTimestamp > 0 {
		debt.UpdatedAt = time.Unix(debtCr.Status.LastUpdateTimestamp, 0).UTC()
	} else {
		debt.UpdatedAt = debtCr.CreationTimestamp.UTC()
	}
	statusRecords := make([]pkgtypes.DebtStatusRecord, len(debtCr.Status.DebtStatusRecords))
	for i, record := range debtCr.Status.DebtStatusRecords {
		statusRecords[i] = pkgtypes.DebtStatusRecord{
			ID:            uuid.New(),
			UserUID:       userUID,
			LastStatus:    convertDebtStatus(record.LastStatus),
			CurrentStatus: convertDebtStatus(record.CurrentStatus),
			CreateAt:      record.UpdateTime.UTC(),
		}
	}
	debt.StatusRecords = statusRecords
	return debt
}

func convertDebtStatus(statusType accountv1.DebtStatusType) pkgtypes.DebtStatusType {
	switch statusType {
	case accountv1.NormalPeriod:
		return pkgtypes.NormalPeriod
	case accountv1.WarningPeriod:
		return pkgtypes.DebtPeriod
	case accountv1.ApproachingDeletionPeriod:
		return pkgtypes.DebtPeriod
	case accountv1.ImminentDeletionPeriod:
		return pkgtypes.DebtDeletionPeriod
	case accountv1.LowBalancePeriod:
		return pkgtypes.LowBalancePeriod
	case accountv1.CriticalBalancePeriod:
		return pkgtypes.CriticalBalancePeriod
	case accountv1.DebtPeriod:
		return pkgtypes.DebtPeriod
	case accountv1.DebtDeletionPeriod:
		return pkgtypes.DebtDeletionPeriod
	case accountv1.FinalDeletionPeriod:
		return pkgtypes.FinalDeletionPeriod
	case "":
		return pkgtypes.NormalPeriod
	default:
		logrus.Errorf("unknown debt status type: %v", statusType)
		return ""
	}
}

func (r *AccountReconciler) syncResourceQuotaAndLimitRange(
	ctx context.Context,
	nsName string,
) error {
	objs := []client.Object{
		client.Object(resources.GetDefaultLimitRange(nsName, nsName)),
		client.Object(resources.GetDefaultResourceQuota(nsName, ResourceQuotaPrefix+nsName)),
	}
	for i := range objs {
		err := retry.Retry(10, 1*time.Second, func() error {
			_, err := controllerutil.CreateOrUpdate(ctx, r.Client, objs[i], func() error {
				return nil
			})
			return err
		})
		if err != nil {
			return fmt.Errorf("sync resource %T failed: %w", objs[i], err)
		}
	}
	return nil
}

func (r *AccountReconciler) syncSubscriptionWorkspaceResourceQuotaAndLimitRange(
	ctx context.Context,
	userUID uuid.UUID,
	nsName string,
) error {
	objs := []client.Object{client.Object(resources.GetDefaultLimitRange(nsName, nsName))}
	for i := range objs {
		err := retry.Retry(10, 1*time.Second, func() error {
			_, err := controllerutil.CreateOrUpdate(ctx, r.Client, objs[i], func() error {
				return nil
			})
			return err
		})
		if err != nil {
			return fmt.Errorf("sync resource %T failed: %w", objs[i], err)
		}
	}
	// determine that each user subscribes only once
	err := r.AccountV2.GetGlobalDB().
		Where(&pkgtypes.WorkspaceSubscription{UserUID: userUID}).
		First(&pkgtypes.WorkspaceSubscription{}).
		Error
	if err == nil {
		// If already have other subscription Spaces, just create WorkspaceSubscription and set the quota to 0
		return r.handlerNoTrialInitialWorkspaceSubscription(ctx, userUID, nsName)
	} else if !errors.Is(err, gorm.ErrRecordNotFound) {
		return fmt.Errorf("check user workspace subscription existence failed: %w", err)
	}
	if r.NonSupportFreeTrial {
		return r.handlerNoTrialInitialWorkspaceSubscription(ctx, userUID, nsName)
	} else {
		err = r.handleProbationPeriodWorkspaceSubscription(ctx, userUID, nsName)
		if err != nil {
			return fmt.Errorf("handle workspace subscription created failed: %w", err)
		}
	}
	r.Logger.Info("handle workspace subscription created", "namespace", nsName)
	return nil
}

func (r *AccountReconciler) syncResourceQuotaAndLimitRangeBySubscription(
	ctx context.Context,
	owner, nsName string,
) error {
	userUID, err := r.AccountV2.GetUserUID(&pkgtypes.UserQueryOpts{Owner: owner})
	if err != nil {
		return fmt.Errorf("get userUID failed: %w", err)
	}
	userSub, err := r.AccountV2.GetSubscription(&pkgtypes.UserQueryOpts{UID: userUID})
	if err != nil {
		return fmt.Errorf("get user subscription failed: %w", err)
	}
	quota, ok := r.SubscriptionQuotaLimit[userSub.PlanName]
	if !ok {
		return fmt.Errorf("subscription plan %s not found", userSub.PlanName)
	}
	objs := []client.Object{
		client.Object(resources.GetDefaultLimitRange(nsName, nsName)),
		client.Object(getDefaultResourceQuota(nsName, ResourceQuotaPrefix+nsName, quota)),
	}
	for i := range objs {
		err := retry.Retry(10, 1*time.Second, func() error {
			_, err := controllerutil.CreateOrUpdate(ctx, r.Client, objs[i], func() error {
				return nil
			})
			return err
		})
		if err != nil {
			return fmt.Errorf("sync resource %T failed: %w", objs[i], err)
		}
	}
	return nil
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

// func (r *AccountReconciler) adaptEphemeralStorageLimitRange(ctx context.Context, nsName string) error {
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
	r.accountSystemNamespace = env.GetEnvWithDefault(
		accountv1.AccountSystemNamespaceEnv,
		"account-system",
	)
	regions, err := r.AccountV2.GetRegions()
	if err != nil {
		return fmt.Errorf("get regions failed: %w", err)
	}
	r.allRegionDomain = make([]string, len(regions))
	for i, region := range regions {
		r.allRegionDomain[i] = region.Domain
	}
	r.localDomain = r.AccountV2.GetLocalRegion().Domain
	r.jwtManager = utils.NewJWTManager(os.Getenv(EnvJwtSecret), 10*time.Minute)
	plans, err := r.AccountV2.GetWorkspaceSubscriptionPlanList()
	if err != nil {
		return fmt.Errorf("failed to get workspace subscription plans: %w", err)
	}
	res, err := resources.ParseResourceLimitWithPlans(plans)
	if err != nil {
		return fmt.Errorf("failed to parse resource limits with plans: %w", err)
	}
	r.workspaceSubPlans = plans
	r.workspaceSubPlansResourceLimit = res
	r.InitUserAccountFunc = r.AccountV2.NewAccount
	r.NonSupportFreeTrial = os.Getenv(EnvNonFreeTrialEnabled) == trueStatus
	r.VLogger = logger.NewFeishuLogger(
		nil,
		os.Getenv("FEISHU_WEBHOOK"),
		logger.INFO,
		r.localDomain+"-account-controller",
	)
	notifyConfigStr := os.Getenv("NOTIFY_CONFIG")
	if notifyConfigStr != "" {
		notifyConfig, err := usernotify.ParseConfigsWithJSON(notifyConfigStr)
		if err != nil {
			return fmt.Errorf("parse notify config error: %w", err)
		}
		r.UserContactProvider = usernotify.NewMemoryContactProvider()
		r.UserNotificationService = usernotify.NewEventNotificationService(
			notifyConfig,
			r.UserContactProvider,
		)
	} else {
		r.Logger.Info("NOTIFY_CONFIG is empty")
	}
	// r.SyncNSQuotaFunc = r.syncResourceQuotaAndLimitRange
	return ctrl.NewControllerManagedBy(mgr).
		For(&userv1.User{}, builder.WithPredicates(OnlyCreatePredicate{})).
		WithOptions(rateOpts).
		Complete(r)
}

type OnlyCreatePredicate struct {
	predicate.Funcs
}

func (OnlyCreatePredicate) Update(_ event.UpdateEvent) bool {
	return false
}

func (OnlyCreatePredicate) Create(_ event.CreateEvent) bool {
	return true
}

func RawParseRechargeConfig() (activities pkgtypes.Activities, discountsteps []int64, discountratios []float64, returnErr error) {
	// local test
	// config, err := clientcmd.BuildConfigFromFlags("", os.Getenv("KUBECONFIG"))
	// if err != nil {
	//	fmt.Printf("Error building kubeconfig: %v\n", err)
	//	os.Exit(1)
	//}
	config, err := rest.InClusterConfig()
	if err != nil {
		returnErr = fmt.Errorf("get in cluster config failed: %w", err)
		return activities, discountsteps, discountratios, returnErr
	}
	clientset, err := kubernetes.NewForConfig(config)
	if err != nil {
		returnErr = fmt.Errorf("get clientset failed: %w", err)
		return activities, discountsteps, discountratios, returnErr
	}
	configMap, err := clientset.CoreV1().
		ConfigMaps(SEALOS).
		Get(context.TODO(), RECHARGEGIFT, metav1.GetOptions{})
	if err != nil {
		returnErr = fmt.Errorf("get configmap failed: %w", err)
		return activities, discountsteps, discountratios, returnErr
	}
	if returnErr = parseConfigList(configMap.Data["steps"], &discountsteps, "steps"); returnErr != nil {
		return activities, discountsteps, discountratios, returnErr
	}

	if returnErr = parseConfigList(configMap.Data["ratios"], &discountratios, "ratios"); returnErr != nil {
		return activities, discountsteps, discountratios, returnErr
	}

	if activityStr := configMap.Data["activities"]; activityStr != "" {
		returnErr = json.Unmarshal([]byte(activityStr), &activities)
	}
	return activities, discountsteps, discountratios, returnErr
}

func parseConfigList(s string, list any, configName string) error {
	for _, v := range strings.Split(s, ",") {
		switch list := list.(type) {
		case *[]int64:
			i, err := strconv.ParseInt(v, 10, 64)
			if err != nil {
				return fmt.Errorf("%s format error: %w", configName, err)
			}
			*list = append(*list, i)
		case *[]float64:
			f, err := strconv.ParseFloat(v, 64)
			if err != nil {
				return fmt.Errorf("%s format error: %w", configName, err)
			}
			*list = append(*list, f)
		}
	}
	return nil
}

const BaseUnit = 1_000_000

func getFirstRechargeDiscount(amount int64, discount pkgtypes.UserRechargeDiscount) (bool, int64) {
	if discount.FirstRechargeSteps != nil && discount.FirstRechargeSteps[amount/BaseUnit] > 0 {
		return true, discount.FirstRechargeSteps[amount/BaseUnit] * BaseUnit
	}
	if discount.DefaultSteps != nil {
		return false, discount.DefaultSteps[amount/BaseUnit] * BaseUnit
	}
	return false, 0
}

func (r *AccountReconciler) BillingCVM() error {
	cvmMap, err := r.CVMDBClient.GetPendingStateInstance(os.Getenv("LOCAL_REGION"))
	if err != nil {
		return fmt.Errorf("get pending state instance failed: %w", err)
	}
	for userUID, cvms := range cvmMap {
		fmt.Println("billing cvm", userUID, cvms)
		// userUID, namespace := strings.Split(userInfo, "/")[0], strings.Split(userInfo, "/")[1]
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
			if errors.Is(err, gorm.ErrRecordNotFound) {
				fmt.Println("user not found", userQueryOpts)
				continue
			}
			return fmt.Errorf("get user failed: %w", err)
		}
		id, err := gonanoid.New(12)
		if err != nil {
			return fmt.Errorf("generate billing id error: %w", err)
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
		err = r.AccountV2.AddDeductionBalanceWithFunc(
			&pkgtypes.UserQueryOpts{UID: user.UserUID},
			billing.Amount,
			func() error {
				if saveErr := r.DBClient.SaveBillings(billing); saveErr != nil {
					return fmt.Errorf("save billing failed: %w", saveErr)
				}
				return nil
			},
			func() error {
				if saveErr := r.CVMDBClient.SetDoneStateInstance(cvmIDs...); saveErr != nil {
					return fmt.Errorf("set done state instance failed: %w", saveErr)
				}
				return nil
			},
		)
		if err != nil {
			return fmt.Errorf("add balance failed: %w", err)
		}
		fmt.Printf("billing cvm success %#+v\n", billing)
	}
	return nil
}
