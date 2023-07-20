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

package manager

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"strconv"
	"sync"
	"time"

	"github.com/go-logr/logr"
	v1 "github.com/labring/sealos/controllers/common/notification/api/v1"
	corev1 "k8s.io/api/core/v1"
	"k8s.io/apimachinery/pkg/types"
	ctrl "sigs.k8s.io/controller-runtime"
	"sigs.k8s.io/controller-runtime/pkg/client"
)

var ExpectScale ClusterScale
var ActualScale ClusterScale

var logger logr.Logger
var resyncTime int64
var lastSetFlagTime int64

func init() {
	logger = ctrl.Log.WithName("ReSyncForClusterScale")
	resyncTime = int64(time.Hour)
}

type ClusterScaleManager struct {
	AvaliableScaleData map[string]ClusterScale
	ExpectScaleData    ClusterScale
}

type ClusterScale struct {
	NodeLimit int64 `json:"nodeLimit"`
	CPULimit  int64 `json:"cpuLimit"`
	Expire    int64 `json:"expire"`
}

// create cluster scale manager
func CSMCreator(availableScaleSecret corev1.Secret) ClusterScaleManager {
	available := TidyAvailableScaleData(availableScaleSecret.Data)
	expect := GetExpectScale(available, GetOneByNodeLimit, GetOneByCPULimit)
	return ClusterScaleManager{
		AvaliableScaleData: available,
		ExpectScaleData:    expect,
	}
}

func (csm ClusterScaleManager) SerializeToSecretData() (map[string][]byte, error) {
	output := make(map[string][]byte)
	for k, v := range csm.AvaliableScaleData {
		data, err := json.Marshal(v)
		if err != nil {
			return nil, err
		}
		output[k] = data
	}
	return output, nil
}

func (csm ClusterScaleManager) ValidateExpectation() bool {
	return ExpectScale.CPULimit == csm.ExpectScaleData.CPULimit &&
		ExpectScale.NodeLimit == csm.ExpectScaleData.NodeLimit
}

func NewClusterExpectScale(nods, cpus, days int64) ClusterScale {
	return ClusterScale{
		NodeLimit: nods,
		CPULimit:  cpus,
		Expire:    time.Now().Add(time.Hour * 24 * time.Duration(days)).Unix(),
	}
}

func ExpandClusterScale(current *ClusterScale, nods, cpus, days int64) ClusterScale {
	return ClusterScale{
		NodeLimit: current.NodeLimit + nods,
		CPULimit:  current.CPULimit + cpus,
		Expire:    time.Now().Add(time.Hour * 24 * time.Duration(days)).Unix(),
	}
}

func TidyAvailableScaleData(secretData map[string][]byte) map[string]ClusterScale {
	result := make(map[string]ClusterScale)
	for key, value := range secretData {
		var scaleData ClusterScale
		err := json.Unmarshal(value, &scaleData)
		if err != nil {
			delete(secretData, key)
			continue
		}
		// the scale policy has expired
		if scaleData.Expire < time.Now().Unix() {
			continue
		}
		result[key] = scaleData
	}

	return result
}

type GetOneByField func(data map[string]ClusterScale) (string, ClusterScale)

func GetOneByNodeLimit(data map[string]ClusterScale) (string, ClusterScale) {
	var expectScale ClusterScale
	CmpNodes := func(value ClusterScale) bool {
		if value.NodeLimit == expectScale.NodeLimit {
			return value.Expire > expectScale.Expire
		}
		return value.NodeLimit > expectScale.NodeLimit
	}
	var key string
	for k, v := range data {
		if CmpNodes(v) {
			key = k
			expectScale = v
		}
	}
	return key, expectScale
}

func GetOneByCPULimit(data map[string]ClusterScale) (string, ClusterScale) {
	var expectScale ClusterScale
	CmpCpus := func(value ClusterScale) bool {
		if value.CPULimit == expectScale.CPULimit {
			return value.Expire > expectScale.Expire
		}
		return value.CPULimit > expectScale.CPULimit
	}
	var key string
	for k, v := range data {
		if CmpCpus(v) {
			key = k
			expectScale = v
		}
	}
	return key, expectScale
}

func GetAvailableScaleExpire(data map[string]ClusterScale) int64 {
	var expire int64
	for _, v := range data {
		if expire < v.Expire {
			expire = v.Expire
		}
	}
	return expire
}

func GetExpectScale(data map[string]ClusterScale,
	getOneByNodeLimit GetOneByField,
	getOneByCPULimit GetOneByField) ClusterScale {
	key1, value1 := getOneByCPULimit(data)
	key2, value2 := getOneByNodeLimit(data)
	if key1 == key2 {
		return value1
	}
	getMaxValue := func(a int64, b int64) int64 {
		if a > b {
			return a
		}
		return b
	}
	getMinValue := func(a int64, b int64) int64 {
		if a < b {
			return a
		}
		return b
	}
	var currentScale ClusterScale
	currentScale.CPULimit = getMaxValue(value1.CPULimit, value2.CPULimit)
	currentScale.NodeLimit = getMaxValue(value1.NodeLimit, value2.NodeLimit)
	currentScale.Expire = getMinValue(value1.Expire, value2.Expire)

	return currentScale
}

func InterfaceToInt64(value interface{}) (int64, error) {
	switch v := value.(type) {
	case int64:
		return v, nil
	case float64:
		return int64(v), nil
	default:
		return 0, errors.New("cannot convert value of type to int64")
	}
}

func ContainsFields(data map[string]interface{}, fields ...string) bool {
	for _, field := range fields {
		_, ok := data[field]
		if !ok {
			return false
		}
	}
	return true
}

func AdjustScaleOfCluster(ctx context.Context, client client.Client, css corev1.Secret, payload map[string]interface{}) error {
	if !ContainsFields(payload, NodeField, CPUField, DurationField) {
		return nil
	}
	nodes, err := InterfaceToInt64(payload[NodeField])
	if err != nil {
		return err
	}
	cpus, err := InterfaceToInt64(payload[CPUField])
	if err != nil {
		return err
	}
	days, err := InterfaceToInt64(payload[DurationField])
	if err != nil {
		return err
	}
	newClusterScale := NewClusterExpectScale(nodes, cpus, days)
	err = updateClusterScaleSecret(newClusterScale, &css)
	if err != nil {
		return fmt.Errorf("failed to update secret: %w", err)
	}
	return client.Update(ctx, &css)
}

func ExpandScaleOfCluster(ctx context.Context, client client.Client, css corev1.Secret, payload map[string]interface{}) error {
	if !ContainsFields(payload, DurationField, AddNodeField, AddCPUField) {
		return nil
	}
	addNodes, err := InterfaceToInt64(payload[AddNodeField])
	if err != nil {
		return err
	}
	addCpus, err := InterfaceToInt64(payload[AddCPUField])
	if err != nil {
		return err
	}
	days, err := InterfaceToInt64(payload[DurationField])
	if err != nil {
		return err
	}

	mapClusterScale := TidyAvailableScaleData(css.Data)

	currentClusterScale := GetExpectScale(mapClusterScale, GetOneByNodeLimit, GetOneByCPULimit)

	newClusterScale := ExpandClusterScale(&currentClusterScale, addNodes, addCpus, days)

	err = updateClusterScaleSecret(newClusterScale, &css)
	if err != nil {
		return fmt.Errorf("failed to update secret: %w", err)
	}
	return client.Update(ctx, &css)
}

func updateClusterScaleSecret(ces ClusterScale, css *corev1.Secret) error {
	newClusterScaleString, err := json.Marshal(ces)
	if err != nil {
		return fmt.Errorf("failed to parse cluster limit: %w", err)
	}
	if css.Data == nil {
		css.Data = make(map[string][]byte)
	}
	tmpValue := make(map[string]interface{})
	for k, v := range css.Data {
		tmpValue[k] = v
	}
	suffix := GetNextMapKeySuffix(tmpValue, "cluster-scale")
	newKeyName := "cluster-scale-" + strconv.Itoa(suffix)
	css.Data[newKeyName] = newClusterScaleString
	return nil
}

type ClusterScaleMonitor struct {
	client.Client
}

func (ms *ClusterScaleMonitor) Start(ctx context.Context) error {
	en := make(chan error)
	callback := func() error {
		return ReSyncForClusterScale(ctx, ms.Client)
	}
	go ReSync(en, callback)
	go func() {
		for err := range en {
			if err != nil {
				logger.Error(err, "failed to check for cluster scale")
			}
		}
	}()
	return nil
}

func ReSync(errchan chan<- error, cb func() error) {
	for {
		logger.Info("start resync work for cluster scale")
		err := cb()
		if err != nil {
			errchan <- err
			time.Sleep(time.Second * 5)
			continue
		}
		time.Sleep(time.Duration(resyncTime))
	}
}

func ReSyncForClusterScale(ctx context.Context, client client.Client) error {
	var (
		availableScaleSecret corev1.Secret
	)
	var readEventOperations ReadOperationList

	trigger := func() error {
		if availableScaleSecret.Labels == nil {
			availableScaleSecret.Labels = make(map[string]string)
		}
		availableScaleSecret.Labels["lastEventDate"] = time.Now().UTC().Format("20060102150405")

		return client.Update(ctx, &availableScaleSecret)
	}

	// Part I: update the actual scale data of cluster
	actualScaleData, err := CountClusterNodesAndCPUs(ctx, client)
	if err != nil {
		return fmt.Errorf("CountClusterNodesAndCPUs: %w", err)
	}
	ActualScale = actualScaleData

	if IsCommunityEdition() {
		logger.Info("a comminity edition scale")
		return nil
	}
	logstr := fmt.Sprintf("actual scale-> cpu: %d, nod: %d",
		ActualScale.CPULimit,
		ActualScale.NodeLimit,
	)
	logger.Info(logstr)

	(&ReadEventBuilder{}).WithContext(ctx).WithClient(client).WithObject(&availableScaleSecret).
		WithTag(types.NamespacedName{Namespace: string(Namespace), Name: string(AvailableScaleSecretName)}).
		AddToList(&readEventOperations)

	err = readEventOperations.Execute()
	if err != nil {
		logger.Info("unexpected result in check, trigger controller")
		return trigger()
	}

	manager := CSMCreator(availableScaleSecret)

	if !manager.ValidateExpectation() {
		logger.Info("unexpected result in check, trigger controller")
		logstr1 := fmt.Sprintf("actual expect-> cpu: %d, nod: %d, expire: %s",
			manager.ExpectScaleData.CPULimit,
			manager.ExpectScaleData.NodeLimit,
			time.Unix(manager.ExpectScaleData.Expire, 0).Format("2006-01-02"))
		logstr2 := fmt.Sprintf("expect expect-> cpu: %d, nod: %d, expire: %s",
			ExpectScale.CPULimit,
			ExpectScale.NodeLimit,
			time.Unix(ExpectScale.Expire, 0).Format("2006-01-02"))
		logger.Info(logstr1)
		logger.Info(logstr2)
		return trigger()
	}
	// notification for license soon expired
	users := UserCategory{}
	expire := GetAvailableScaleExpire(manager.AvaliableScaleData)
	daysLeft := (expire - time.Now().Unix()) / (24 * 60 * 60)

	isNeedNotification := func() bool {
		defer func() {
			lastSetFlagTime = time.Now().Unix()
		}()
		if daysLeft <= 1 {
			return true
		}
		if time.Now().Add(time.Hour*24).Unix() < lastSetFlagTime {
			return false
		}
		if daysLeft == 30 || daysLeft == 15 || daysLeft <= 7 {
			return true
		}
		return false
	}

	if users.GetNameSpace(ctx, client) == nil && isNeedNotification() {
		var message string
		if daysLeft >= 0 {
			message = fmt.Sprintf("Your license is about to expire in %d days. When it does, your cluster scale will be limited and you will not be able to create or update applications. Please apply for and activate a new license promptly.", daysLeft)
		} else {
			message = "Your current cluster scale has exceeded the maximum limit. Please purchase a license promptly to expand your cluster size."
		}
		pack := NewNotificationPackageWithLevel(LicenseNoticeTitle, SEALOS, Message(message), v1.High)
		SubmitNotificationWithUserCategory(ctx, client, users, UserPrefix, pack)
	}

	return nil
}

func CountClusterNodesAndCPUs(ctx context.Context, client client.Client) (ClusterScale, error) {
	var clusterScale ClusterScale
	totalNodesResource := NewTotalNodesResource(`\w+\.com/gpu`)

	nodeList := &corev1.NodeList{}
	err := client.List(ctx, nodeList)
	if err != nil {
		return clusterScale, err
	}

	var wg sync.WaitGroup
	for _, node := range nodeList.Items {
		wg.Add(1)
		go totalNodesResource.GetGPUCPUMemoryResource(&node, &wg)
	}
	wg.Wait()
	clusterScale.CPULimit = totalNodesResource.TotalCPU.Value()
	clusterScale.NodeLimit = int64(len(nodeList.Items))
	return clusterScale, nil
}

func IsCommunityEdition() bool {
	return ActualScale.NodeLimit <= 4 && ActualScale.CPULimit <= 64
}
