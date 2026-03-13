package v1

import (
	"strings"
	"testing"

	netv1 "k8s.io/api/networking/v1"
)

func TestIngressValidator_checkForbiddenDomainSuffix(t *testing.T) {
	tests := []struct {
		name      string
		deny      DomainList
		host      string
		wantError bool
	}{
		{
			name:      "empty deny list passes",
			deny:      nil,
			host:      "a.example.com",
			wantError: false,
		},
		{
			name:      "subdomain is denied",
			deny:      DomainList{"example.com"},
			host:      "a.example.com",
			wantError: true,
		},
		{
			name:      "apex domain is denied",
			deny:      DomainList{"example.com"},
			host:      "example.com",
			wantError: true,
		},
		{
			name:      "other domain passes",
			deny:      DomainList{"example.com"},
			host:      "a.other.com",
			wantError: false,
		},
		{
			name:      "case and trailing dot are normalized",
			deny:      DomainList{"example.com"},
			host:      "A.Example.Com.",
			wantError: true,
		},
	}

	v := &IngressValidator{}
	i := &netv1.Ingress{
		Spec: netv1.IngressSpec{
			Rules: []netv1.IngressRule{{}},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			v.DenyDomains = tt.deny
			rule := &netv1.IngressRule{Host: tt.host}
			err := v.checkDeny(i, rule)
			if tt.wantError && err == nil {
				t.Fatalf("expected error, got nil")
			}
			if !tt.wantError && err != nil {
				t.Fatalf("expected nil, got %v", err)
			}
			if tt.wantError {
				// Ensure error code is correct.
				got := err.Error()
				if !strings.HasPrefix(got, "40303:") {
					t.Fatalf("expected error code prefix %q, got %q", "40303:", got)
				}
			}
		})
	}
}
