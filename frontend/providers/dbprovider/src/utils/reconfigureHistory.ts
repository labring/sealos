type ReconfigureParameter = {
  key: string;
  value: string;
};

type ReconfigureOpsRequest = {
  metadata?: {
    annotations?: Record<string, string>;
  };
  spec?: {
    reconfigure?: {
      configurations?: {
        keys?: {
          parameters?: ReconfigureParameter[];
        }[];
      }[];
    };
  };
};

export type ReconfigureHistoryConfiguration = {
  parameterName: string;
  newValue: string;
  oldValue?: string;
};

const parsePreviousConfigurations = (annotation?: string) => {
  if (!annotation) return {};

  try {
    const configurations = JSON.parse(annotation) as Record<string, unknown>;
    return Object.fromEntries(
      Object.entries(configurations).map(([key, value]) => [
        key,
        typeof value === 'string' ? value.replace(/^['"](.*)['"]$/, '$1') : String(value)
      ])
    );
  } catch {
    return {};
  }
};

export const getReconfigureHistoryConfigurations = (
  item: ReconfigureOpsRequest,
  previousConfigKey: string,
  missingOldValue?: string
): ReconfigureHistoryConfiguration[] => {
  const previousConfigurations = parsePreviousConfigurations(
    item.metadata?.annotations?.[previousConfigKey]
  );
  const parameters =
    item.spec?.reconfigure?.configurations?.flatMap(
      (configuration) => configuration.keys?.flatMap((key) => key.parameters || []) || []
    ) || [];

  return parameters.map((param) => ({
    parameterName: param.key,
    newValue: param.value,
    ...(previousConfigurations[param.key] !== undefined
      ? { oldValue: previousConfigurations[param.key] }
      : missingOldValue !== undefined
      ? { oldValue: missingOldValue }
      : {})
  }));
};
