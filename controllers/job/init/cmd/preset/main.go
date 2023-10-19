package main

import (
	"context"
	"crypto/sha256"
	"encoding/base64"
	"encoding/hex"
	"fmt"
	"github.com/labring/sealos/controllers/job/init/internal/util/controller"
	userv1 "github.com/labring/sealos/controllers/user/api/v1"
	utilruntime "k8s.io/apimachinery/pkg/util/runtime"
	clientgoscheme "k8s.io/client-go/kubernetes/scheme"
	"os"
	"sigs.k8s.io/controller-runtime/pkg/client"
	"time"

	"github.com/google/uuid"
	util "github.com/labring/sealos/controllers/job/init/internal/util/database"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/mongo"
	mongoOptions "go.mongodb.org/mongo-driver/mongo/options"
	"k8s.io/apimachinery/pkg/runtime"
	ctrl "sigs.k8s.io/controller-runtime"
)

var (
	scheme    = runtime.NewScheme()
	presetLog = ctrl.Log.WithName("preset")
)

func init() {
	utilruntime.Must(clientgoscheme.AddToScheme(scheme))
	utilruntime.Must(userv1.AddToScheme(scheme))
	//+kubebuilder:scaffold:scheme
}

const MaxRetryConnectDB = 10

func main() {
	// TODO do something
	err := presetUser(context.Background())
	if err != nil {
		presetLog.Error(err, "failed to preset root user")
		os.Exit(1)
	}
	presetLog.Info("preset root user successfully")
}

func createKubernetesClient() (client.Client, error) {
	c, err := client.New(ctrl.GetConfigOrDie(), client.Options{})
	if err != nil {
		return nil, err
	}
	return c, nil
}

func presetUser(ctx context.Context) error {
	if err := createUser(ctx); err != nil {
		return err
	}

	//init mongodb database
	client, err := initMongoDB(ctx)
	defer client.Disconnect(context.Background())
	if err != nil {
		presetLog.Error(err, "unable to connect to database")
		os.Exit(1)
	}

	// preset root user
	uuid := uuid.New().String()
	passwd := HashPassword(util.DefaultPassword, SaltKey)
	user := NewUser(uuid, util.DefaultUser, util.DefaultUser, passwd, util.DefaultK8sUser)
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

// TODO fix this
func createUser(ctx context.Context) error {
	clt, err := createKubernetesClient()
	if err != nil {
		fmt.Printf("Error creating Kubernetes client: %v\n", err)
		os.Exit(1)
	}
	if err := clt.Create(ctx, &userv1.User{
		ObjectMeta: ctrl.ObjectMeta{
			Name: controller.DefaultUser,
		},
	}); err != nil {
		return err
	}
	return nil
}

func IsExists(ctx context.Context, collection *mongo.Collection) bool {
	filter := bson.M{"password_user": util.DefaultUser}
	var existingUser util.User
	err := collection.FindOne(ctx, filter).Decode(&existingUser)
	return err == nil
}

func NewUser(uid, name, passwordUser, password, k8sUser string) util.User {
	return util.User{
		UID:          uid,
		Name:         name,
		PasswordUser: passwordUser,
		Password:     password,
		// to iso string
		CreatedTime: time.Now().Format(time.RFC3339),
		K8sUsers: []util.K8sUser{
			{
				Name: k8sUser,
			},
		},
	}
}

func HashPassword(password string, saltKey string) string {
	hash := sha256.New()
	validSalt, err := DecodeBase64(saltKey)
	if err != nil {
		presetLog.Error(err, "failed to decode salt")
		os.Exit(1)
	}
	hash.Write([]byte(password + string(validSalt)))
	return hex.EncodeToString(hash.Sum(nil))
}

func DecodeBase64(s string) ([]byte, error) {
	data, err := base64.StdEncoding.DecodeString(s)
	if err != nil {
		presetLog.Error(err, "failed to decode base64")
		return nil, err
	}
	return data, nil
}

func initMongoDB(ctx context.Context) (*mongo.Client, error) {
	var client *mongo.Client
	var err error
	MongoURI := os.Getenv("MONGO_URI")
	clientOptions := mongoOptions.Client().ApplyURI(MongoURI)
	for i := 0; i < MaxRetryConnectDB; i++ {
		client, err = mongo.Connect(ctx, clientOptions)
		if err != nil {
			presetLog.Error(err, "failed to connect to mongo")
			time.Sleep(5 * time.Second)
			continue
		}
		err = client.Ping(ctx, nil)
		if err != nil {
			presetLog.Error(err, "failed to ping mongo")
			time.Sleep(5 * time.Second)
			continue
		}
		presetLog.Info("connect to mongo successfully")
		break
	}
	if err != nil {
		return nil, fmt.Errorf("failed to connect to mongo: %w", err)
	}
	return client, nil

}
