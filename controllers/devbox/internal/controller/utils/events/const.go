package events

const (
	EventReasonStorageCleanupRequested = "Storage cleanup requested" // Storage cleanup events
	EventReasonDevboxStateChanged      = "Devbox state changed"      // Devbox state changed events

	EventMessageStorageCleanupFormat = "devboxName=%s, contentID=%s, baseImage=%s"
)
