package cloud

type Flavor struct {
	Region string
	Zone string
	VMType string //real cloud provider type
	Image string
}

//Region return real vm type on some region zone
/*
   input: cn-hangzhou cn-hangzhou-b 2C4G
   output: ecs.c6.large m-j6c7cmqwpqwn8onaey27
*/
type Region interface {
	QueryFlavor(region string, zone string, vmType string) (Flavor,error)
}

