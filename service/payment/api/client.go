package api

import (
	"fmt"
	"io"
	"net/http"
	"os"

	"github.com/mdp/qrterminal"
)

func QRTerminalPay(user string, amount int64, domain string) error {
	if domain == "" {
		domain = "http://localhost:8071"
	}

	url := fmt.Sprintf("%s/payment/wechat/code-url?amount=%d&user=%s", domain, amount, user)

	resp, err := http.Get(url)
	if err != nil {
		return fmt.Errorf("get payment code-url failed: %v", err)
	}
	defer resp.Body.Close()

	b, err := io.ReadAll(resp.Body)
	if err != nil {
		return fmt.Errorf("get payment code-url failed, read body failed: %v", err)
	}

	qrterminal.Generate(string(b), qrterminal.L, os.Stdout)
	return nil
}
