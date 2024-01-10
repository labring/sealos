package dao

import (
	"testing"
	"time"

	"github.com/labring/sealos/controllers/pkg/resources"
	"go.mongodb.org/mongo-driver/mongo"
)

func TestMongoDB_GetRechargeAmount(t *testing.T) {
	type fields struct {
		Client         *mongo.Client
		AccountDBName  string
		BillingConn    string
		PropertiesConn string
		Properties     *resources.PropertyTypeLS
	}
	type args struct {
		user      string
		startTime time.Time
		endTime   time.Time
	}
	tests := []struct {
		name    string
		fields  fields
		args    args
		want    int64
		wantErr bool
	}{
		// TODO: Add test cases.
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			m := &MongoDB{
				Client:         tt.fields.Client,
				AccountDBName:  tt.fields.AccountDBName,
				BillingConn:    tt.fields.BillingConn,
				PropertiesConn: tt.fields.PropertiesConn,
				Properties:     tt.fields.Properties,
			}
			got, err := m.GetRechargeAmount(tt.args.user, tt.args.startTime, tt.args.endTime)
			if (err != nil) != tt.wantErr {
				t.Errorf("GetRechargeAmount() error = %v, wantErr %v", err, tt.wantErr)
				return
			}
			if got != tt.want {
				t.Errorf("GetRechargeAmount() got = %v, want %v", got, tt.want)
			}
		})
	}
}
