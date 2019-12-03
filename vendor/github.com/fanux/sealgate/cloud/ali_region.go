package cloud

type region interface {
	DefaultZone(zone string) string
	DefaultFlavor(cpu,mem int) string
	DefaultImage(img string) string
}

type aliRegion struct {
	zones []zone
}

type zone struct {
	name string
	flavors []flavor
}

type flavor struct {
	image string
	cpu int
	mem float64
	instanceType string
}

func NewRegion(r string) region {
	//_ := &aliRegion{}
	return nil
}