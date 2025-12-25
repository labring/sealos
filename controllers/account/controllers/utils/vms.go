// Copyright © 2024 sealos.
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

package utils

import (
	"errors"
	"fmt"
	"time"

	"github.com/astaxie/beego/logs"
	"github.com/volcengine/volc-sdk-golang/service/vms"
)

func SendVms(phone, template, numberPollNo string, sendTime time.Time, forbidTimes []string) error {
	var paramList []*vms.SingleParam
	paramList = append(paramList, &vms.SingleParam{
		Phone: phone,
		Type:  1,
		// RingAgainTimes:    1,
		// RingAgainInterval: 5,
		TriggerTime:  &vms.JsonTime{Time: sendTime},
		Resource:     template,
		NumberPoolNo: numberPollNo,
		SingleOpenId: phone + "-" + sendTime.Format(time.DateOnly),
	})
	if len(forbidTimes) != 0 {
		paramList[0].ForbidTimeList = []*vms.ForbidTimeItem{
			{
				Times: forbidTimes,
			},
		}
	}
	req := &vms.SingleAppendRequest{
		List: paramList,
	}
	result, statusCode, err := vms.DefaultInstance.SingleBatchAppend(req)
	if err != nil {
		return fmt.Errorf("failed to SingleBatchAppend: %w", err)
	}
	if result.ResponseMetadata.Error != nil {
		return fmt.Errorf("failed to send vms: %v", result.ResponseMetadata.Error)
	}
	logs.Info("send vms status code: %d, result: %#+v", statusCode, result.Result)
	if statusCode != 200 {
		return fmt.Errorf("failed to send vms, status code: %d, err : %v", statusCode, result)
	}
	return nil
}

// SendVmsMultiple sends VMS to multiple phone numbers with the same template and settings
func SendVmsMultiple(
	phones []string,
	template, numberPollNo string,
	sendTime time.Time,
	forbidTimes []string,
) error {
	if len(phones) == 0 {
		return errors.New("phone numbers cannot be empty")
	}

	paramList := make([]*vms.SingleParam, 0, len(phones))
	for _, phone := range phones {
		if phone == "" {
			continue
		}
		singleParam := &vms.SingleParam{
			Phone: phone,
			Type:  1,
			// RingAgainTimes:    1,
			// RingAgainInterval: 5,
			TriggerTime:  &vms.JsonTime{Time: sendTime},
			Resource:     template,
			NumberPoolNo: numberPollNo,
			SingleOpenId: phone + "-" + sendTime.Format(time.DateOnly),
		}

		if len(forbidTimes) != 0 {
			singleParam.ForbidTimeList = []*vms.ForbidTimeItem{
				{
					Times: forbidTimes,
				},
			}
		}

		paramList = append(paramList, singleParam)
	}

	if len(paramList) == 0 {
		return errors.New("no valid phone numbers provided")
	}

	req := &vms.SingleAppendRequest{
		List: paramList,
	}

	result, statusCode, err := vms.DefaultInstance.SingleBatchAppend(req)
	if err != nil {
		return fmt.Errorf("failed to SingleBatchAppend: %w", err)
	}
	if result.ResponseMetadata.Error != nil {
		return fmt.Errorf("failed to send vms: %v", result.ResponseMetadata.Error)
	}
	logs.Info("send vms multiple status code: %d, result: %#+v", statusCode, result.Result)
	if statusCode != 200 {
		return fmt.Errorf("failed to send vms, status code: %d, err : %v", statusCode, result)
	}
	return nil
}
