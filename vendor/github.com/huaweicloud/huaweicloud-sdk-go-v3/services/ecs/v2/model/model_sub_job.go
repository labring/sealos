package model

import (
	"github.com/huaweicloud/huaweicloud-sdk-go-v3/core/utils"

	"errors"
	"github.com/huaweicloud/huaweicloud-sdk-go-v3/core/converter"

	"strings"
)

//
type SubJob struct {
	// Job的状态。  - SUCCESS：成功。  - RUNNING：运行中。  - FAIL：失败。  - INIT：正在初始化。

	Status *SubJobStatus `json:"status,omitempty"`

	Entities *SubJobEntities `json:"entities,omitempty"`
	// 子任务的ID。

	JobId *string `json:"job_id,omitempty"`
	// 子任务的类型。

	JobType *string `json:"job_type,omitempty"`
	// 开始时间。

	BeginTime *string `json:"begin_time,omitempty"`
	// 结束时间。

	EndTime *string `json:"end_time,omitempty"`
	// Job执行失败时的错误码。  Job执行成功后，该值为null。

	ErrorCode *string `json:"error_code,omitempty"`
	// Job执行失败时的错误原因。  Job执行成功后，该值为null。

	FailReason *string `json:"fail_reason,omitempty"`
}

func (o SubJob) String() string {
	data, err := utils.Marshal(o)
	if err != nil {
		return "SubJob struct{}"
	}

	return strings.Join([]string{"SubJob", string(data)}, " ")
}

type SubJobStatus struct {
	value string
}

type SubJobStatusEnum struct {
	SUCCESS SubJobStatus
	RUNNING SubJobStatus
	FAIL    SubJobStatus
	INIT    SubJobStatus
}

func GetSubJobStatusEnum() SubJobStatusEnum {
	return SubJobStatusEnum{
		SUCCESS: SubJobStatus{
			value: "SUCCESS",
		},
		RUNNING: SubJobStatus{
			value: "RUNNING",
		},
		FAIL: SubJobStatus{
			value: "FAIL",
		},
		INIT: SubJobStatus{
			value: "INIT",
		},
	}
}

func (c SubJobStatus) MarshalJSON() ([]byte, error) {
	return utils.Marshal(c.value)
}

func (c *SubJobStatus) UnmarshalJSON(b []byte) error {
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
