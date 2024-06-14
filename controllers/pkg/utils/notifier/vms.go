package notifier

import (
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
		//RingAgainTimes:    1,
		//RingAgainInterval: 5,
		TriggerTime:  &vms.JsonTime{Time: sendTime},
		Resource:     template,
		NumberPoolNo: numberPollNo,
		SingleOpenId: phone + "-" + sendTime.Format("2006-01-02"),
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
		return fmt.Errorf("failed to SingleBatchAppend: %v", err)
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
