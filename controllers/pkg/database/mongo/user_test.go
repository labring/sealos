package mongo

import (
	"context"
	"os"
	"testing"
)

func Test_mongoDB_GetUser(t *testing.T) {
	dbCTX := context.Background()
	m, err := NewMongoInterface(dbCTX, os.Getenv("MONGODB_URI"))
	if err != nil {
		t.Errorf("failed to connect mongo: error = %v", err)
	}
	defer func() {
		if err = m.Disconnect(dbCTX); err != nil {
			t.Errorf("failed to disconnect mongo: error = %v", err)
		}
	}()
	users, err := m.GetUser("admin")
	if err != nil {
		t.Errorf("failed to get user: error = %v", err)
	}
	t.Logf("users: %v", users)
}
