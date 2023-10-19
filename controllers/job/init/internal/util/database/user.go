package database

import (
	"context"
	"crypto/sha256"
	"encoding/base64"
	"encoding/hex"
	"os"
	"time"

	"github.com/go-logr/logr"
	"github.com/google/uuid"
	"github.com/labring/sealos/controllers/job/init/internal/util/controller"
)

// user stored in mongoDB.
type User struct {
	UID          string    `bson:"uid" json:"uid"`
	Name         string    `bson:"name" json:"name"`
	PasswordUser string    `bson:"password_user" json:"password_user"`
	Password     string    `bson:"password" json:"password"`
	CreatedTime  string    `bson:"created_time" json:"created_time"`
	K8sUsers     []K8sUser `bson:"k8s_users" json:"k8s_users"`
}

type K8sUser struct {
	Name string `bson:"name" json:"name"`
}

const (
	// pre-defined user info
	DefaultUser     = "admin"
	DefaultPassword = "sealos2023"
	DefaultK8sUser  = "admin"
)

var (
	SaltKey = os.Getenv("SaltKey")
)

func NewUser(uid, name, passwordUser, password, k8sUser string) User {
	return User{
		UID:          uid,
		Name:         name,
		PasswordUser: passwordUser,
		Password:     password,
		// to iso string
		CreatedTime: time.Now().Format(time.RFC3339),
		K8sUsers: []K8sUser{
			{
				Name: k8sUser,
			},
		},
	}
}

func PresetUser(presetLog *logr.Logger, ctx context.Context) error {
	if err := controller.NewUser(ctx); err != nil {
		return err
	}

	//init mongodb database
	client, err := InitMongoDB(ctx)
	defer client.Disconnect(context.Background())
	if err != nil {
		presetLog.Error(err, "unable to connect to database")
		os.Exit(1)
	}

	// preset root user
	uuid := uuid.New().String()
	passwd := HashPassword(presetLog, DefaultPassword, SaltKey)
	user := NewUser(uuid, DefaultUser, DefaultUser, passwd, DefaultK8sUser)
	userDB := os.Getenv("MONGO_USER_DB")
	userCol := os.Getenv("MONGO_USER_COL")
	collection := client.Database(userDB).Collection(userCol)

	// check if the user already exists
	exist := IsExists(ctx, collection)
	if exist {
		presetLog.Info("root user already exists")
		return nil
	}
	// insert root user
	insertResult, err := collection.InsertOne(context.Background(), user)
	if err != nil {
		presetLog.Error(err, "failed to insert root user")
		return err
	}
	presetLog.Info("insert root user successfully", "insertResult", insertResult)
	return nil
}

func HashPassword(presetLog *logr.Logger, password string, saltKey string) string {
	hash := sha256.New()
	validSalt, err := DecodeBase64(presetLog, saltKey)
	if err != nil {
		presetLog.Error(err, "failed to decode salt")
		os.Exit(1)
	}
	hash.Write([]byte(password + string(validSalt)))
	return hex.EncodeToString(hash.Sum(nil))
}

func DecodeBase64(presetLog *logr.Logger, s string) ([]byte, error) {
	data, err := base64.StdEncoding.DecodeString(s)
	if err != nil {
		presetLog.Error(err, "failed to decode base64")
		return nil, err
	}
	return data, nil
}
