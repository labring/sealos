package converter

import (
	"reflect"
	"strconv"
	"strings"

	"github.com/huaweicloud/huaweicloud-sdk-go-v3/core/utils"
)

type Converter interface {
	CovertStringToInterface(value string) (interface{}, error)
	CovertStringToPrimitiveTypeAndSetField(field reflect.Value, value string, isPtr bool) error
}

func StringConverterFactory(vType string) Converter {
	switch vType {
	case "string":
		return StringConverter{}
	case "int32":
		return Int32Converter{}
	case "int64":
		return Int64Converter{}
	case "float32":
		return Float32Converter{}
	case "float64":
		return Float32Converter{}
	case "bool":
		return BooleanConverter{}
	default:
		return nil
	}
}

func ConvertInterfaceToString(value interface{}) string {
	if value == nil {
		return ""
	}
	switch value.(type) {
	case float64:
		return strconv.FormatFloat(value.(float64), 'f', -1, 64)
	case float32:
		return strconv.FormatFloat(float64(value.(float32)), 'f', -1, 64)
	case int:
		return strconv.Itoa(value.(int))
	case uint:
		return strconv.Itoa(int(value.(uint)))
	case int8:
		return strconv.Itoa(int(value.(int8)))
	case uint8:
		return strconv.Itoa(int(value.(uint8)))
	case int16:
		return strconv.Itoa(int(value.(int16)))
	case uint16:
		return strconv.Itoa(int(value.(uint16)))
	case int32:
		return strconv.Itoa(int(value.(int32)))
	case uint32:
		return strconv.Itoa(int(value.(uint32)))
	case int64:
		return strconv.FormatInt(value.(int64), 10)
	case uint64:
		return strconv.FormatUint(value.(uint64), 10)
	case string:
		return value.(string)
	case []byte:
		return string(value.([]byte))
	default:
		b, err := utils.Marshal(value)
		if err != nil {
			return ""
		}
		return string(strings.Trim(string(b[:]), "\""))
	}
}
