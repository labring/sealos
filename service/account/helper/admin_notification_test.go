package helper

import (
	"context"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/gin-gonic/gin"
)

func TestParseAdminNotificationRecipientsReq(t *testing.T) {
	gin.SetMode(gin.TestMode)

	tests := []struct {
		name    string
		body    string
		methods []string
		ns      []string
		wantErr bool
	}{
		{
			name:    "defaults to email and normalizes values",
			body:    `{"namespaces":[" ns-a ","ns-a"]}`,
			methods: []string{NotificationMethodEmail},
			ns:      []string{"ns-a"},
		},
		{
			name:    "accepts email and phone",
			body:    `{"namespaces":["ns-a"],"notificationMethods":[" EMAIL ","phone"]}`,
			methods: []string{NotificationMethodEmail, NotificationMethodPhone},
			ns:      []string{"ns-a"},
		},
		{
			name:    "rejects unsupported method",
			body:    `{"namespaces":["ns-a"],"notificationMethods":["sms"]}`,
			wantErr: true,
		},
		{
			name:    "rejects empty namespace",
			body:    `{"namespaces":[" "]}`,
			wantErr: true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			c, _ := gin.CreateTestContext(httptest.NewRecorder())
			c.Request = httptest.NewRequestWithContext(
				context.Background(),
				"POST",
				"/admin/v1alpha1/notification-recipients",
				strings.NewReader(tt.body),
			)
			c.Request.Header.Set("Content-Type", "application/json")

			got, err := ParseAdminNotificationRecipientsReq(c)
			if (err != nil) != tt.wantErr {
				t.Fatalf("ParseAdminNotificationRecipientsReq() error = %v, wantErr %v", err, tt.wantErr)
			}
			if tt.wantErr {
				return
			}
			if len(got.Namespaces) != len(tt.ns) || len(got.NotificationMethods) != len(tt.methods) {
				t.Fatalf("parsed request = %+v, want namespaces %v and methods %v", got, tt.ns, tt.methods)
			}
			for i := range tt.ns {
				if got.Namespaces[i] != tt.ns[i] {
					t.Fatalf("namespace[%d] = %q, want %q", i, got.Namespaces[i], tt.ns[i])
				}
			}
			for i := range tt.methods {
				if got.NotificationMethods[i] != tt.methods[i] {
					t.Fatalf("method[%d] = %q, want %q", i, got.NotificationMethods[i], tt.methods[i])
				}
			}
		})
	}
}
