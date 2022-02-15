package model

import (
	"github.com/huaweicloud/huaweicloud-sdk-go-v3/core/utils"

	"errors"
	"github.com/huaweicloud/huaweicloud-sdk-go-v3/core/converter"

	"strings"
)

// Response Object
type ShowJobResponse struct {
	// 开始时间。

	BeginTime *string `json:"begin_time,omitempty"`
	// 查询Job的API请求出现错误时，返回的错误码。

	Code *string `json:"code,omitempty"`
	// 结束时间。

	EndTime *string `json:"end_time,omitempty"`

	Entities *JobEntities `json:"entities,omitempty"`
	// Job执行失败时的错误码。  Job执行成功后，该值为null。

	ErrorCode *string `json:"error_code,omitempty"`
	// Job执行失败时的错误原因。  Job执行成功后，该值为null。

	FailReason *string `json:"fail_reason,omitempty"`
	// 异步请求的任务ID。

	JobId *string `json:"job_id,omitempty"`
	// 异步请求的任务类型。

	JobType *string `json:"job_type,omitempty"`
	// 查询Job的API请求出现错误时，返回的错误消息。

	Message *string `json:"message,omitempty"`
	// Job的状态。  - SUCCESS：成功。  - RUNNING：运行中。  - FAIL：失败。  - INIT：正在初始化。

	Status         *ShowJobResponseStatus `json:"status,omitempty"`
	HttpStatusCode int                    `json:"-"`
}

func (o ShowJobResponse) String() string {
	data, err := utils.Marshal(o)
	if err != nil {
		return "ShowJobResponse struct{}"
	}

	return strings.Join([]string{"ShowJobResponse", string(data)}, " ")
}

type ShowJobResponseStatus struct {
	value string
}

type ShowJobResponseStatusEnum struct {
	SUCCESS ShowJobResponseStatus
	RUNNING ShowJobResponseStatus
	FAIL    ShowJobResponseStatus
	INIT    ShowJobResponseStatus
}

func GetShowJobResponseStatusEnum() ShowJobResponseStatusEnum {
	return ShowJobResponseStatusEnum{
		SUCCESS: ShowJobResponseStatus{
			value: "SUCCESS",
		},
		RUNNING: ShowJobResponseStatus{
			value: "RUNNING",
		},
		FAIL: ShowJobResponseStatus{
			value: "FAIL",
		},
		INIT: ShowJobResponseStatus{
			value: "INIT",
		},
	}
}

func (c ShowJobResponseStatus) MarshalJSON() ([]byte, error) {
	return utils.Marshal(c.value)
}

func (c *ShowJobResponseStatus) UnmarshalJSON(b []byte) error {
	myConverter := converter.StringConverterFactory("string")
	if myConverter != nil {
		val, err := myConverter.CovertStringToInterface(strings.Trim(string(b[:]), "\""))
		if err == nil {
			c.value = val.(string)
			return nil
		}
		return err
	} else {
		return errors.New("convert enum data to string error")
	}
}
