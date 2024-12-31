package utils

import (
	"errors"
	"io"
	"net/http"
	"strings"

	"github.com/aws/aws-sdk-go-v2/aws"
	"github.com/aws/aws-sdk-go-v2/credentials"
	"github.com/aws/aws-sdk-go-v2/service/bedrockruntime"
	"github.com/gin-gonic/gin"
	"github.com/labring/sealos/service/aiproxy/relay/meta"
	"github.com/labring/sealos/service/aiproxy/relay/model"
)

type AwsAdapter interface {
	ConvertRequest(meta *meta.Meta, req *http.Request) (string, http.Header, io.Reader, error)
	DoResponse(meta *meta.Meta, c *gin.Context) (usage *model.Usage, err *model.ErrorWithStatusCode)
}

type AwsConfig struct {
	Region string
	AK     string
	SK     string
}

func GetAwsConfigFromKey(key string) (*AwsConfig, error) {
	split := strings.Split(key, "|")
	if len(split) != 3 {
		return nil, errors.New("invalid key format")
	}
	return &AwsConfig{
		Region: split[0],
		AK:     split[1],
		SK:     split[2],
	}, nil
}

func AwsClient(config *AwsConfig) *bedrockruntime.Client {
	return bedrockruntime.New(bedrockruntime.Options{
		Region:      config.Region,
		Credentials: aws.NewCredentialsCache(credentials.NewStaticCredentialsProvider(config.AK, config.SK, "")),
	})
}

func awsClientFromKey(key string) (*bedrockruntime.Client, error) {
	config, err := GetAwsConfigFromKey(key)
	if err != nil {
		return nil, err
	}
	return AwsClient(config), nil
}

const AwsClientKey = "aws_client"

func AwsClientFromMeta(meta *meta.Meta) (*bedrockruntime.Client, error) {
	awsClientI, ok := meta.Get(AwsClientKey)
	if ok {
		return awsClientI.(*bedrockruntime.Client), nil
	}
	awsClient, err := awsClientFromKey(meta.Channel.Key)
	if err != nil {
		return nil, err
	}
	meta.Set(AwsClientKey, awsClient)
	return awsClient, nil
}
