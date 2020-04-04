package logger

import (
	"fmt"
	"testing"
	"time"
)

var p = `{
	"Console": {
		"level": "DEBG",
		"color": true
	},
	"File": {
		"filename": "app.log",
		"level": "EROR",
		"daily": true,
		"maxlines": 1000000,
		"maxsize": 256,
		"maxdays": -1,
		"append": true,
		"permit": "0660"
	}
}`

func TestLogOut(t *testing.T) {
	SetLogger(p)
	Trace("this is Trace")
	Debug("this is Debug")
	Info("this is Info")
	Warn("this is Warn")
	Error("this is Error")
	Crit("this is Critical")
	Alert("this is Alert")
	Emer("this is Emergency")
}

func TestLogConfigReload(t *testing.T) {
	go func() {
		for {
			for level, _ := range LevelMap {
				SetLogger(fmt.Sprintf(`{
					"Console": {
						"level": "%s",
						"color": true
					},
					"File": {
						"filename": "app.log",
						"level": "%s",
						"daily": true,
						"maxlines": 1000000,
						"maxsize": 1,
						"maxdays": -1,
						"append": true,
						"permit": "0660"
				}}`, level, level))
				time.Sleep(time.Second * 3)
			}
		}
	}()

	for {
		Trace("this is Trace")
		Debug("this is Debug")
		Info("this is Info")
		Warn("this is Warn")
		Error("this is Error")
		Crit("this is Critical")
		Alert("this is Alert")
		Emer("this is Emergency")
		fmt.Println()

		time.Sleep(time.Millisecond)
	}

}

func TestLogTimeFormat(t *testing.T) {

	var formats = map[string]string{"ANSIC": "Mon Jan _2 15:04:05 2006",
		"UnixDate":    "Mon Jan _2 15:04:05 MST 2006",
		"RubyDate":    "Mon Jan 02 15:04:05 -0700 2006",
		"RFC822":      "02 Jan 06 15:04 MST",
		"RFC822Z":     "02 Jan 06 15:04 -0700",
		"RFC850":      "Monday, 02-Jan-06 15:04:05 MST",
		"RFC1123":     "Mon, 02 Jan 2006 15:04:05 MST",
		"RFC1123Z":    "Mon, 02 Jan 2006 15:04:05 -0700",
		"RFC3339":     "2006-01-02T15:04:05Z07:00",
		"RFC3339Nano": "2006-01-02T15:04:05.999999999Z07:00",
		"Kitchen":     "3:04PM",
		"Stamp":       "Jan _2 15:04:05",
		"StampMilli":  "Jan _2 15:04:05.000",
		"StampMicro":  "Jan _2 15:04:05.000000",
		"StampNano":   "Jan _2 15:04:05.000000000",
	}
	for timeType, format := range formats {
		SetLogger(fmt.Sprintf(`{
					"TimeFormat":"%s",
					"Console": {
						"level": "TRAC",
						"color": true
					},
					"File": {
						"filename": "app.log",
						"level": "TRAC",
						"daily": true,
						"maxlines": 1000000,
						"maxsize": 1,
						"maxdays": -1,
						"append": true,
						"permit": "0660"
				}}`, format))
		fmt.Printf("========%s time format========\n", timeType)
		Trace("Trace", timeType)
		Debug("Debug", timeType)
		Info("Info", timeType)
		Warn("Warn", timeType)
		Error("Error", timeType)
		Crit("Critical", timeType)
		Alert("Alert", timeType)
		Emer("Emergency", timeType)
	}

}
