import { KubeEvent } from "@/k8slens/kube-object";
import { ItemStore } from "./data.store";
import { Resource } from "../types/types";

export type EventData = {
  type?: string;
  message?: string;
  involvedObject?: string;
  count?: number;
  source: string;
  creationTimestamp?: string;
  lastTimestamp?: string;
};

export class EventStore extends ItemStore<KubeEvent> {
  constructor() {
    super(Resource.Events);
  }

  getEventsData() {
    const events: Array<EventData> = [];

    events.push(
      ...this.items.map(
        (event) =>
          ({
            message: event.message,
            involvedObject: event.involvedObject.name,
            type: event.type,
            count: event.count,
            source: `${event.getSource()}: ${event.involvedObject.name}`,
            creationTimestamp: event.metadata.creationTimestamp,
            lastTimestamp: event.lastTimestamp,
          } as EventData)
      )
    );
    return events;
  }
}
