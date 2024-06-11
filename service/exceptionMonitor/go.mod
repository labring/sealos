module github.com/labring/sealos/service/exceptionMonitor

go 1.20

require (
	github.com/alibabacloud-go/tea v1.2.1
	github.com/labring/sealos/service v0.0.0-00010101000000-000000000000
	github.com/alibabacloud-go/dysmsapi-20170525/v3 v3.0.6 // indirect
	github.com/labring/sealos/controllers/account v0.0.0-00010101000000-000000000000
)

replace (
	github.com/labring/sealos/service => ../../service
)
