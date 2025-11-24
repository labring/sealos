package license

import (
	"context"
	"errors"
	"net/http"
	"time"

	"sigs.k8s.io/controller-runtime/pkg/client"
	"sigs.k8s.io/controller-runtime/pkg/healthz"
)

const defaultCheckerTimeout = 5 * time.Second

type LicenseChecker struct {
	checker Checker
	timeout time.Duration
}

func NewLicenseChecker(c client.Client) *LicenseChecker {
	return &LicenseChecker{
		checker: NewChecker(c),
		timeout: defaultCheckerTimeout,
	}
}

func (l *LicenseChecker) Checker() healthz.Checker {
	return func(_ *http.Request) error {
		ctx, cancel := context.WithTimeout(context.Background(), l.timeout)
		defer cancel()

		res, err := l.checker.Evaluate(ctx)
		if err != nil {
			return err
		}
		if !res.Valid {
			if res.Reason != "" {
				return errors.New(res.Reason)
			}
			return ErrNoValidLicense
		}
		return nil
	}
}
