/*
Copyright 2022 cuisongliu@qq.com.

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

package helper

import (
	corev1 "k8s.io/api/core/v1"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"

	v1 "github.com/labring/sealos/controllers/user/api/v1"
)

func IsConditionTrue(conditions []v1.Condition, condition v1.Condition) bool {
	for _, con := range conditions {
		if con.Type == condition.Type && con.Status == condition.Status {
			return true
		}
	}
	return false
}
func IsConditionsTrue(conditions []v1.Condition) bool {
	if len(conditions) == 0 {
		return false
	}
	for _, condition := range conditions {
		if condition.Type == v1.Ready {
			continue
		}
		if condition.Status != corev1.ConditionTrue {
			return false
		}
	}
	return true
}

func GetCondition(conditions []v1.Condition, condition *v1.Condition) *v1.Condition {
	for _, con := range conditions {
		if con.Type == condition.Type {
			return &con
		}
	}
	return condition
}

func DiffCondition(condition1 *v1.Condition, condition2 *v1.Condition) bool {
	if condition1.Reason != condition2.Reason || condition1.Status != condition2.Status || condition1.Message != condition2.Message {
		return true
	}
	return false
}

// UpdateCondition updates condition in cluster conditions using giving condition
// adds condition if not existed
func UpdateCondition(conditions []v1.Condition, condition v1.Condition) []v1.Condition {
	if conditions == nil {
		conditions = make([]v1.Condition, 0)
	}
	hasCondition := false
	for i, cond := range conditions {
		if cond.Type == condition.Type {
			hasCondition = true
			if DiffCondition(conditions[i].DeepCopy(), condition.DeepCopy()) {
				conditions[i] = condition
			}
		}
	}
	if !hasCondition {
		conditions = append(conditions, condition)
	}
	return conditions
}
func DeleteCondition(conditions []v1.Condition, conditionType v1.ConditionType) []v1.Condition {
	if conditions == nil {
		conditions = make([]v1.Condition, 0)
	}
	newConditions := make([]v1.Condition, 0)
	for _, cond := range conditions {
		if cond.Type == conditionType {
			continue
		}
		newConditions = append(newConditions, cond)
	}
	conditions = newConditions
	return conditions
}

func SetConditionError(condition *v1.Condition, reason string, err error) {
	condition.LastHeartbeatTime = metav1.Now()
	condition.Status = corev1.ConditionFalse
	condition.Reason = reason
	condition.Message = err.Error()
}
