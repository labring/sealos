package dao

import (
	"strings"
	"testing"

	"github.com/google/uuid"
	"github.com/labring/sealos/controllers/pkg/types"
)

func TestAdminPage(t *testing.T) {
	got := adminPage(2, 10, 21)
	want := struct {
		pageIndex  int
		pageSize   int
		totalItems int64
		totalPages int
	}{2, 10, 21, 3}
	if got.PageIndex != want.pageIndex ||
		got.PageSize != want.pageSize ||
		got.TotalItems != want.totalItems ||
		got.TotalPages != want.totalPages {
		t.Fatalf("adminPage() = %+v, want %+v", got, want)
	}
}

func TestNormalizeAdminTradeNo(t *testing.T) {
	id := uuid.New()
	var compact strings.Builder
	for _, part := range []string{id.String()[:8], id.String()[9:13], id.String()[14:18], id.String()[19:23], id.String()[24:]} {
		compact.WriteString(part)
	}
	if got := normalizeAdminTradeNo(compact.String()); got != id.String() {
		t.Fatalf("normalizeAdminTradeNo(compact) = %q, want %q", got, id.String())
	}
	if got := normalizeAdminTradeNo("not-a-uuid"); got != "" {
		t.Fatalf("normalizeAdminTradeNo(invalid) = %q, want empty", got)
	}
}

func TestFormatAdminUser(t *testing.T) {
	user := &types.User{
		UID:      uuid.New(),
		ID:       "user-id",
		Nickname: "User",
		Status:   types.UserStatusNormal,
	}
	account := &types.Account{Balance: 120, DeductionBalance: 30}
	providers := []types.OauthProvider{
		{ProviderType: types.OauthProviderTypePassword, ProviderID: "username"},
		{ProviderType: types.OauthProviderTypeEmail, ProviderID: "user@example.com"},
		{ProviderType: types.OauthProviderTypeGithub, ProviderID: "github-id"},
	}

	got := formatAdminUser(user, providers, account)
	if got.Username != "username" || got.Email != "user@example.com" ||
		got.SourceType != "ADMIN_CREATED" {
		t.Fatalf("formatAdminUser() identity fields = %+v", got)
	}
	if len(got.SourceProviderTypes) != 1 ||
		got.SourceProviderTypes[0] != string(types.OauthProviderTypePassword) {
		t.Fatalf("formatAdminUser() source providers = %v", got.SourceProviderTypes)
	}
	if got.Balance == nil || *got.Balance != 120 || got.DeductionBalance == nil ||
		*got.DeductionBalance != 30 ||
		got.AvailableBalance == nil ||
		*got.AvailableBalance != 90 {
		t.Fatalf("formatAdminUser() balances = %+v", got)
	}
	if got.BillingStatus != "normal" {
		t.Fatalf("formatAdminUser() billing status = %q, want normal", got.BillingStatus)
	}
}

func TestGroupAdminUserProviders(t *testing.T) {
	userUID := uuid.New()
	providers := []types.OauthProvider{
		{
			UserUID:      userUID,
			ProviderType: types.OauthProviderTypeEmail,
			ProviderID:   "user@example.com",
		},
	}
	alertAccounts := []types.UserAlertNotificationAccount{
		{
			UserUID:      userUID,
			ProviderType: types.OauthProviderTypeEmail,
			ProviderID:   "user@example.com",
		},
		{UserUID: userUID, ProviderType: types.OauthProviderTypePhone, ProviderID: "+123456789"},
		{UserUID: userUID, ProviderType: types.OauthProviderTypeGithub, ProviderID: "github-id"},
	}

	got := groupAdminUserProviders(providers, alertAccounts)[userUID]
	if len(got) != 2 {
		t.Fatalf("groupAdminUserProviders() returned %d providers, want 2", len(got))
	}
	if got[0].ProviderID != "user@example.com" || got[1].ProviderID != "+123456789" {
		t.Fatalf("groupAdminUserProviders() = %+v", got)
	}
}

func TestIntMapToStringMap(t *testing.T) {
	got := intMapToStringMap(map[int64]int64{100: 95, 1000: 850})
	if len(got) != 2 || got["100"] != 95 || got["1000"] != 850 {
		t.Fatalf("intMapToStringMap() = %v", got)
	}
}
