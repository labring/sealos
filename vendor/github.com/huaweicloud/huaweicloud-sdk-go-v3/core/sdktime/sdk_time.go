package sdktime

import (
	"fmt"
	"strings"
	"time"
)

type SdkTime time.Time

func (t *SdkTime) UnmarshalJSON(data []byte) error {
	tmp := strings.Trim(string(data[:]), "\"")

	now, err := time.ParseInLocation(`2006-01-02T15:04:05Z`, tmp, time.UTC)
	if err == nil {
		*t = SdkTime(now)
		return err
	}

	now, err = time.ParseInLocation(`2006-01-02T15:04:05`, tmp, time.UTC)
	if err == nil {
		*t = SdkTime(now)
		return err
	}

	now, err = time.ParseInLocation(`2006-01-02 15:04:05`, tmp, time.UTC)
	if err == nil {
		*t = SdkTime(now)
		return err
	}

	now, err = time.ParseInLocation(`2006-01-02T15:04:05+08:00`, tmp, time.UTC)
	if err == nil {
		*t = SdkTime(now)
		return err
	}

	now, err = time.ParseInLocation(time.RFC3339, tmp, time.UTC)
	if err == nil {
		*t = SdkTime(now)
		return err
	}

	now, err = time.ParseInLocation(time.RFC3339Nano, tmp, time.UTC)
	if err == nil {
		*t = SdkTime(now)
		return err
	}

	return err
}

func (t SdkTime) MarshalJSON() ([]byte, error) {
	rs := []byte(fmt.Sprintf(`"%s"`, t.String()))
	return rs, nil
}

func (t SdkTime) String() string {
	return time.Time(t).Format(`2006-01-02T15:04:05Z`)
}
