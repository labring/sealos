package notify

import (
	"bytes"
	"context"
	"errors"
	"net/http"
	"time"

	"github.com/bytedance/sonic"
	"github.com/labring/sealos/service/aiproxy/common/config"
	"github.com/labring/sealos/service/aiproxy/common/trylock"
)

type FeishuNotifier struct {
	wh string
}

func level2Color(level Level) string {
	switch level {
	case LevelInfo:
		return FeishuColorGreen
	case LevelError:
		return FeishuColorRed
	case LevelWarn:
		return FeishuColorOrange
	default:
		return FeishuColorGreen
	}
}

func (f *FeishuNotifier) Notify(level Level, title, message string) {
	stdNotifier.Notify(level, title, message)
	go func() {
		_ = PostToFeiShuv2(context.Background(), level2Color(level), title, message, f.wh)
	}()
}

func (f *FeishuNotifier) NotifyThrottle(level Level, key string, expiration time.Duration, title, message string) {
	if trylock.Lock(key, expiration) {
		stdNotifier.Notify(level, title, message)
		go func() {
			_ = PostToFeiShuv2(context.Background(), level2Color(level), title, message, f.wh)
		}()
	}
}

func NewFeishuNotify(wh string) Notifier {
	return &FeishuNotifier{
		wh: wh,
	}
}

type FSMessagev2 struct {
	MsgType string `json:"msg_type"`
	Email   string `json:"email"`
	Card    Cards  `json:"card"`
}

type Cards struct {
	Config   Conf      `json:"config"`
	Elements []Element `json:"elements"`
	Header   Headers   `json:"header"`
}

type Conf struct {
	WideScreenMode bool `json:"wide_screen_mode"`
	EnableForward  bool `json:"enable_forward"`
}

type Te struct {
	Content string `json:"content"`
	Tag     string `json:"tag"`
}

type Element struct {
	Tag      string    `json:"tag"`
	Text     Te        `json:"text"`
	Content  string    `json:"content"`
	Elements []Element `json:"elements"`
}

type Titles struct {
	Content string `json:"content"`
	Tag     string `json:"tag"`
}

type Headers struct {
	Title    Titles `json:"title"`
	Template string `json:"template"`
}

type TenantAccessMeg struct {
	AppID     string `json:"app_id"`
	AppSecret string `json:"app_secret"`
}

type TenantAccessResp struct {
	Code              int    `json:"code"`
	Msg               string `json:"msg"`
	TenantAccessToken string `json:"tenant_access_token"`
}

type FeiShuv2Resp struct {
	StatusCode    int    `json:"StatusCode"`
	StatusMessage string `json:"StatusMessage"`
	Code          int    `json:"code"`
	Data          any    `json:"data"`
	Msg           string `json:"msg"`
}

const (
	FeishuColorOrange = "orange"
	FeishuColorGreen  = "green"
	FeishuColorRed    = "red"
)

func PostToFeiShuv2(ctx context.Context, color, title, text, wh string) error {
	if wh == "" {
		return errors.New("feishu webhook url is empty")
	}
	note := config.GetNotifyNote()
	if note == "" {
		note = "AI Proxy"
	}
	u := FSMessagev2{
		MsgType: "interactive",
		Card: Cards{
			Config: Conf{
				WideScreenMode: true,
				EnableForward:  true,
			},
			Header: Headers{
				Title: Titles{
					Content: title,
					Tag:     "plain_text",
				},
				Template: color,
			},
			Elements: []Element{
				{
					Tag: "div",
					Text: Te{
						Content: text,
						Tag:     "lark_md",
					},
				},
				{
					Tag: "hr",
				},
				{
					Tag: "note",
					Elements: []Element{
						{
							Content: note,
							Tag:     "lark_md",
						},
					},
				},
			},
		},
	}

	data, err := sonic.ConfigDefault.Marshal(u)
	if err != nil {
		return err
	}
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, wh, bytes.NewReader(data))
	if err != nil {
		return err
	}
	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()
	feishuResp := FeiShuv2Resp{}
	if err := sonic.ConfigDefault.NewDecoder(resp.Body).Decode(&feishuResp); err != nil {
		return err
	}
	if feishuResp.Code != 0 {
		return errors.New(feishuResp.Msg)
	}
	return nil
}
