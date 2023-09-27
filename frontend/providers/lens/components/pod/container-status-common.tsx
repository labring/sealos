import { PodContainerStatus } from "@/k8slens/kube-object";
import { Box } from "@chakra-ui/react";
import { LocaleDate } from "../common/local-date";
import moment from "moment-timezone";
import { getStatusColor } from "@/utils/status-color";

export type ContainerStatusProps = {
  state: string;
  status: PodContainerStatus | null | undefined;
};

export const ContainerStatus = ({ state, status }: ContainerStatusProps) => {
  const { ready = false, state: containerState = {} } = status ?? {};
  const { terminated } = containerState;

  const color = getStatusColor(state) ?? "color.terminated";

  return (
    <Box as="span" color={color}>
      {state}
      {ready ? ", ready" : null}
      {terminated
        ? ` - ${terminated.reason} (exit code: ${terminated.exitCode})`
        : null}
    </Box>
  );
};

export type ContainerLastStateProps = {
  lastState: string;
  status: PodContainerStatus | null | undefined;
};

export const ContainerLastState = ({
  lastState,
  status,
}: ContainerLastStateProps) => {
  const { lastState: lastContainerState = {} } = status ?? {};
  const { terminated } = lastContainerState;
  const localeTimezone = moment.tz.guess();
  if (lastState === "terminated" && terminated) {
    return (
      <span>
        {lastState}
        <br />
        Reason:
        {`Reason: ${terminated.reason} - exit code: ${terminated.exitCode}`}
        <br />
        {"Started at: "}
        {
          <LocaleDate
            date={terminated.startedAt}
            localeTimezone={localeTimezone}
          />
        }
        <br />
        {"Finished at: "}
        {
          <LocaleDate
            date={terminated.finishedAt}
            localeTimezone={localeTimezone}
          />
        }
        <br />
      </span>
    );
  }

  return null;
};
