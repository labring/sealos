package events

const (
	ReasonStorageCleanupRequested = "storage-cleanup-requested"
	ReasonDevboxStateChanged      = "devbox-state-changed"

	KeyAnnotationReason     = "reason"
	KeyAnnotationDevboxName = "devbox-name"
	KeyAnnotationContentID  = "content-id"
	KeyAnnotationBaseImage  = "base-image"
)

type Annotations map[string]string

func BuildStorageCleanupAnnotations(devboxName, contentID, baseImage string) Annotations {
	return Annotations{
		KeyAnnotationReason:     ReasonStorageCleanupRequested,
		KeyAnnotationDevboxName: devboxName,
		KeyAnnotationContentID:  contentID,
		KeyAnnotationBaseImage:  baseImage,
	}
}
