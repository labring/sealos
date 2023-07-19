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
	"net/http"
	"strconv"
	"sync"
	"time"

	"github.com/go-logr/logr"
	accountv1 "github.com/labring/sealos/controllers/account/api/v1"
	v1 "github.com/labring/sealos/controllers/common/notification/api/v1"
	cloudv1 "github.com/labring/sealos/controllers/licenseissuer/api/v1"
	"github.com/labring/sealos/controllers/pkg/crypto"
	corev1 "k8s.io/api/core/v1"
	"k8s.io/apimachinery/pkg/api/resource"
	"k8s.io/apimachinery/pkg/types"
	ctrl "sigs.k8s.io/controller-runtime"
	"sigs.k8s.io/controller-runtime/pkg/client"
)

const MaxSizeThresholdStr = "800Ki"

const (
	NodeField     = "nod"
	CPUField      = "cpu"
	DurationField = "tte"
	AddNodeField  = "and"
	AddCPUField   = "adc"
)

type Operation interface {
	Execute() error
}

type ReadOperationList struct {
	readOperations []Operation
}

type WriteOperationList struct {
	writeOperations []Operation
}

type ReWriteOperationList struct {
	reWriteOperations []Operation
}

func (list *ReadOperationList) Execute() error {
	for _, op := range list.readOperations {
		err := op.Execute()
		if err != nil {
			return err
		}
	}
	return nil
}

func (list *WriteOperationList) Execute() error {
	reWriteList := &ReWriteOperationList{}

	for _, op := range list.writeOperations {
		err := op.Execute()
		if err != nil {
			reWriteList.AddToList(op)
		}
	}

	if len(reWriteList.reWriteOperations) > 0 {
		err := reWriteList.Execute()
		if err != nil {
			return fmt.Errorf("an error occurred, some operations still failed after retries: %v", err)
		}
	}

	return nil
}

func (list *ReWriteOperationList) AddToList(op Operation) {
	list.reWriteOperations = append(list.reWriteOperations, op)
}

func (list *ReWriteOperationList) Execute() error {
	retryInterval := time.Second * 5 // Retry every 5 seconds
	timeout := time.Minute * 3       // Stop retrying after 3 minutes

	startTime := time.Now()
	for {
		remainingOps := []Operation{}

		for _, op := range list.reWriteOperations {
			err := op.Execute()
			if err != nil {
				remainingOps = append(remainingOps, op)
			}
		}

		if len(remainingOps) == 0 {
			break
		}

		// Update the list of reWriteOperations with the remaining operations
		list.reWriteOperations = remainingOps

		// Check if the timeout has been reached
		if time.Since(startTime) >= timeout {
			return fmt.Errorf("timeout reached, some operations still failed")
		}

		// Wait for the retry interval before trying again
		time.Sleep(retryInterval)
	}

	return nil
}

type ReadEventBuilder struct {
	obj      client.Object
	ctx      context.Context
	client   client.Client
	tag      types.NamespacedName
	callback WriteFunc
}

type WriteEventBuilder struct {
	callback WriteFunc
}

type WriteFunc func() error

func (reb *ReadEventBuilder) WithClient(client client.Client) *ReadEventBuilder {
	reb.client = client
	return reb
}

func (reb *ReadEventBuilder) WithContext(ctx context.Context) *ReadEventBuilder {
	reb.ctx = ctx
	return reb
}

func (reb *ReadEventBuilder) WithObject(obj client.Object) *ReadEventBuilder {
	reb.obj = obj
	return reb
}
func (reb *ReadEventBuilder) WithCallback(callback WriteFunc) *ReadEventBuilder {
	reb.callback = callback
	return reb
}

func (reb *ReadEventBuilder) WithTag(tag types.NamespacedName) *ReadEventBuilder {
	reb.tag = tag
	return reb
}

func (reb *ReadEventBuilder) Read() error {
	err := reb.client.Get(reb.ctx, reb.tag, reb.obj)
	if err != nil && reb.callback != nil {
		return reb.callback()
	}
	return err
}

func (reb *ReadEventBuilder) AddToList(list *ReadOperationList) *ReadOperationList {
	list.readOperations = append(list.readOperations, reb)
	return list
}

func (reb *ReadEventBuilder) Execute() error {
	if reb != nil {
		return reb.Read()
	}
	return fmt.Errorf("ReadEventBuilder excute error: %s", "value can't be nil")
}

func (web *WriteEventBuilder) WithCallback(callback WriteFunc) *WriteEventBuilder {
	web.callback = callback
	return web
}

func (web *WriteEventBuilder) Write() error {
	if web.callback == nil {
		return nil
	}
	return web.callback()
}

func (web *WriteEventBuilder) Execute() error {
	if web != nil {
		return web.Write()
	}
	return fmt.Errorf("WriteEventBuilder excute error: %s", "value can't be nil")
}

func (web *WriteEventBuilder) AddToList(list *WriteOperationList) *WriteOperationList {
	list.writeOperations = append(list.writeOperations, web)
	return list
}

type LicenseMonitorRequest struct {
	UID   string `json:"uid"`
	Token string `json:"token"`
}

type LicenseMonitorResponse struct {
	Key string `json:"key"`
}

func NewLicenseMonitorRequest(secret corev1.Secret, license cloudv1.License) LicenseMonitorRequest {
	if secret.Name != string(UIDSecretName) || secret.Namespace != string(Namespace) {
		return LicenseMonitorRequest{}
	}
	var lmr LicenseMonitorRequest
	lmr.Token = license.Spec.Token
	lmr.UID = string(secret.Data["uid"])
	return lmr
}

func LicenseCheckOnExternalNetwork(license cloudv1.License, secret corev1.Secret, url string, logger logr.Logger) (map[string]interface{}, bool) {
	license.Spec.Key = Key
	payload, ok := crypto.IsLicenseValid(license)
	mr := NewLicenseMonitorRequest(secret, license)
	if !ok {
		var resp LicenseMonitorResponse
		httpBody, err := CommunicateWithCloud("POST", url, mr)
		if err != nil {
			logger.Error(err, "failed to communicate with cloud")
			return nil, false
		}
		if !IsSuccessfulStatusCode(httpBody.StatusCode) {
			logger.Error(err, http.StatusText(httpBody.StatusCode))
			return nil, false
		}
		err = Convert(httpBody.Body, &resp)
		if err != nil {
			logger.Error(err, "failed to convert")
			return nil, false
		}
		license.Spec.Key = resp.Key
		return crypto.IsLicenseValid(license)
	}
	return payload, ok
}

func LicenseCheckOnInternalNetwork(license cloudv1.License) (map[string]interface{}, bool) {
	license.Spec.Key = Key
	return crypto.IsLicenseValid(license)
}

type ClusterScaleManager struct {
	AvaliableScaleData map[string]ClusterScale
	ActualScaleData    ClusterScale
	ExpectScaleData    ClusterScale
}

type ClusterScale struct {
	NodeLimit int64 `json:"nodeLimit"`
	CPULimit  int64 `json:"cpuLimit"`
	Expire    int64 `json:"expire"`
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

/******************************************************/
func TidyAvailableScaleData(secretData map[string][]byte) (map[string]ClusterScale, bool) {
	result := make(map[string]ClusterScale)
	isSanitized := false
	for key, value := range secretData {
		var scaleData ClusterScale
		err := json.Unmarshal(value, &scaleData)
		if err != nil {
			delete(secretData, key)
			isSanitized = true
			continue
		}
		result[key] = scaleData
	}

	return result, isSanitized
}

func DeleteExpireScales(data map[string]ClusterScale) bool {
	isDeleted := false
	current := time.Now().Unix()
	for key, val := range data {
		if val.Expire < current {
			isDeleted = true
			delete(data, key)
		}
	}
	return isDeleted
}

type GetScaleByCondition func(data map[string]ClusterScale) (string, ClusterScale)

func GetScaleOfMaxNodes(data map[string]ClusterScale) (string, ClusterScale) {
	var clusterExpectScale ClusterScale
	CmpNodes := func(value *ClusterScale) bool {
		// If NodeLimit is equal, use Expire as a tie breaker
		if value.NodeLimit == clusterExpectScale.NodeLimit {
			if value.Expire > clusterExpectScale.Expire {
				clusterExpectScale = *value
				return true
			}
			return false
		}
		// Otherwise, use NodeLimit as the primary comparison
		if value.NodeLimit > clusterExpectScale.NodeLimit {
			clusterExpectScale = *value
			return true
		}
		return false
	}
	var key string
	for k, v := range data {
		if CmpNodes(&v) {
			key = k
		}
	}
	return key, clusterExpectScale
}

func GetScaleOfMaxCPU(data map[string]ClusterScale) (string, ClusterScale) {
	var clusterExpectScale ClusterScale
	CmpCpus := func(value *ClusterScale) bool {
		if value.CPULimit == clusterExpectScale.CPULimit {
			if value.Expire > clusterExpectScale.Expire {
				clusterExpectScale = *value
				return true
			}
			return false
		}
		if value.CPULimit > clusterExpectScale.CPULimit {
			clusterExpectScale = *value
			return true
		}
		return false
	}
	var key string
	for k, v := range data {
		if CmpCpus(&v) {
			key = k
		}
	}
	return key, clusterExpectScale
}

func GetCurrentScaleExpire(data map[string]ClusterScale) int64 {
	var expire int64
	for _, v := range data {
		if expire < v.Expire {
			expire = v.Expire
		}
	}
	return expire
}

func GetCurrentScale(data map[string]ClusterScale,
	maxNodeCondition GetScaleByCondition,
	maxCPUCondition GetScaleByCondition) ClusterScale {
	key1, value1 := maxCPUCondition(data)
	key2, value2 := maxNodeCondition(data)
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

func RechargeByLicense(ctx context.Context, client client.Client, logger logr.Logger, account accountv1.Account, payload map[string]interface{}) error {
	if !ContainsFields(payload, "amt") {
		return nil
	}
	amount, err := InterfaceToInt64(payload["amt"])
	if err != nil {
		return errors.New("amount error type")
	}
	charge := amount * BaseCount
	account.Status.Balance += charge
	err = crypto.RechargeBalance(account.Status.EncryptBalance, charge)
	if err != nil {
		logger.Error(err, "Failed to crypto the account balance")
		return err
	}
	err = client.Status().Update(ctx, &account)
	if err != nil {
		logger.Error(err, "Recharge Failed, failed to modify the status")
		return err
	}

	return nil
}

func RecordLicense(ctx context.Context, client client.Client, logger logr.Logger, ls cloudv1.License, lsh corev1.ConfigMap) error {
	size := int64(0)
	for _, value := range lsh.Data {
		size += int64(len(value))
	}
	maxSizeThreshold := resource.MustParse(MaxSizeThresholdStr)
	if size >= maxSizeThreshold.Value() {
		lsh.Data = make(map[string]string)
	}
	tmpValue := make(map[string]interface{})
	for k, v := range lsh.Data {
		tmpValue[k] = v
	}
	suffix := GetNextMapKeySuffix(tmpValue, "license")
	newLicenseKeyName := "license-" + strconv.Itoa(suffix)
	if lsh.Data == nil {
		lsh.Data = make(map[string]string)
	}
	lsh.Data[newLicenseKeyName] = ls.Spec.Token
	err := client.Update(ctx, &lsh)
	if err != nil {
		logger.Error(err, "failed to store license")
		return err
	}
	return nil
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

func ExpandScaleOfClusterTemp(ctx context.Context, client client.Client, css corev1.Secret, payload map[string]interface{}) error {
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

	mapClusterScale, _ := TidyAvailableScaleData(css.Data)

	currentClusterScale := GetCurrentScale(mapClusterScale, GetScaleOfMaxNodes, GetScaleOfMaxCPU)

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

func GetNextMapKeySuffix(data map[string]interface{}, prefix string) int {
	maxSuffix := 0
	for key := range data {
		var currentSuffix int
		_, err := fmt.Sscanf(key, prefix+"-%d", &currentSuffix)
		if err == nil && currentSuffix > maxSuffix {
			maxSuffix = currentSuffix
		}
	}
	return maxSuffix + 1
}

func CheckLicenseExists(configMap *corev1.ConfigMap, license string) bool {
	for _, storedLicense := range configMap.Data {
		if storedLicense == license {
			return true
		}
	}

	return false
}

var logger logr.Logger
var resyncTime int64
var lastSetFlagTime int64

func init() {
	logger = ctrl.Log.WithName("ReSyncForClusterScale")
	resyncTime = int64(time.Minute)
}

type MonitorScale struct {
	client.Client
}

func (ms *MonitorScale) Start(ctx context.Context) error {
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
		actualClusterScale corev1.Secret
		expectClusterScale corev1.Secret
		clusterTotalScale  corev1.Secret
		currentScaleData   ClusterScale
	)
	var readEventOperations ReadOperationList

	trigger := func() error {
		if clusterTotalScale.Labels == nil {
			clusterTotalScale.Labels = make(map[string]string)
		}
		clusterTotalScale.Labels["lastEventDate"] = time.Now().UTC().Format("20060102150405")

		return client.Update(ctx, &clusterTotalScale)
	}

	cs, err := CountClusterNodesAndCPUs(ctx, client)
	if err != nil {
		return fmt.Errorf("CountClusterNodesAndCPUs: %w", err)
	}

	bytes, err := json.Marshal(cs)
	if err != nil {
		return err
	}

	(&ReadEventBuilder{}).WithContext(ctx).WithClient(client).WithObject(&actualClusterScale).
		WithTag(types.NamespacedName{Namespace: string(Namespace), Name: string(ActualScaleSecretName)}).
		WithCallback(func() error {
			actualClusterScale.Data = make(map[string][]byte)
			actualClusterScale.SetName(string(ActualScaleSecretName))
			actualClusterScale.SetNamespace(string(Namespace))
			return client.Create(ctx, &actualClusterScale)
		}).AddToList(&readEventOperations)
	(&ReadEventBuilder{}).WithContext(ctx).WithClient(client).WithObject(&clusterTotalScale).
		WithTag(types.NamespacedName{Namespace: string(Namespace), Name: string(ClusterScaleSecretName)}).
		AddToList(&readEventOperations)
	(&ReadEventBuilder{}).WithContext(ctx).WithClient(client).WithObject(&expectClusterScale).
		WithTag(types.NamespacedName{Namespace: string(Namespace), Name: string(ExpectScaleSecretName)}).
		AddToList(&readEventOperations)

	err = readEventOperations.Execute()
	if err != nil {
		return trigger()
	}

	if actualClusterScale.Data == nil {
		actualClusterScale.Data = make(map[string][]byte)
	}

	// write event
	actualClusterScale.Data[string(ActualScaleSecretKey)] = bytes
	err = client.Update(ctx, &actualClusterScale)
	if err != nil {
		return fmt.Errorf("failed to update actual cluster resource: %w", err)
	}

	err = json.Unmarshal(expectClusterScale.Data[string(ExpectScaleSecretKey)], &currentScaleData)
	if err != nil {
		logger.Info("triggered when json parse failed")
		return trigger()
	}

	clusterScaleTotalData, _ := TidyAvailableScaleData(clusterTotalScale.Data)

	// notification for license soon expired
	users := UserCategory{}
	expire := GetCurrentScaleExpire(clusterScaleTotalData)
	daysLeft := (expire - time.Now().Unix()) / (24 * 60 * 60)

	// fmt.Printf("the left days is: %d\n", daysLeft)

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
			message = fmt.Sprintf("Your license has been expired. Your cluster has be limited and you will not be able to create or update applications. Please apply for and activate a new license promptly.")
		}
		pack := NewNotificationPackageWithLevel(ExpireLicenseTitle, SEALOS, Message(message), v1.High)
		SubmitNotificationWithUserCategory(ctx, client, logger, users, UserPrefix, pack)
	}
	// check scale
	return CheckExpectedScale(currentScaleData, clusterScaleTotalData, trigger)
}

func CheckExpectedScale(currentScaleData ClusterScale, totalData map[string]ClusterScale, trigger func() error) error {
	expectScale := GetCurrentScale(totalData, GetScaleOfMaxNodes, GetScaleOfMaxCPU)

	ok := isConsistent(currentScaleData, expectScale)

	if !ok {
		logger.Info("triggered when check cluster scale")
		return trigger()
	}

	return nil
}

func isConsistent(scale1 ClusterScale, scale2 ClusterScale) bool {
	if scale1.CPULimit == scale2.CPULimit &&
		scale1.NodeLimit == scale2.NodeLimit {
		logger.Info("the current expect scale is consistent with the expect one")
		return true
	}
	logger.Info("the current expect scale is not consistent with the expect one")
	return false
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
