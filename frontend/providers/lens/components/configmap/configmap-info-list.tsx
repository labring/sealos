import { KubeObjectInfo } from "@/utils/kube-object-info";
import { Box, Textarea } from "@chakra-ui/react";
import { entries } from "lodash";

export type ConfigMapInfo = KubeObjectInfo & {
  data: Partial<Record<string, string>>;
  keys: Array<string>;
};

export const ConfigMapInfoList = ({ info }: { info: ConfigMapInfo }) => {
  const data = entries(info.data);

  return (
    <>
      {data.map(([name, value]) => (
        <Box key={name} mb="4px">
          <Box textColor="#51575d" fontWeight={"bold"} pb="1px">
            {name}
          </Box>
          <Textarea disabled value={value} />
        </Box>
      ))}
    </>
  );
};
