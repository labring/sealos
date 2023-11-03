package clusterid

//import (
//	"context"
//	"os"
//
//	"github.com/labring/sealos/controllers/license/internal/util/database"
//)
//
//func GetClusterID(ctx context.Context, db *database.DataBase) (string, error) {
//	// TODO get cluster id from database
//	//id, err := db.GetClusterID(ctx)
//	//if errors.Is(err, mongo.ErrNoDocuments) {
//	//	// if cluster id is not set, set it
//	//	envID := os.Getenv("CLUSTER_ID")
//	//	if envID == "" {
//	//		return "", errors.New("cluster id not set")
//	//	}
//	//	if err := db.StoreClusterID(ctx, os.Getenv("CLUSTER_ID")); err != nil {
//	//		return db.GetClusterID(ctx)
//	//	}
//	//}
//	return os.Getenv("CLUSTER_ID"), nil
//}
