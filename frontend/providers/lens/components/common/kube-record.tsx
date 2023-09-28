import { Grid, GridItem, SystemStyleObject } from "@chakra-ui/react";

export type KubeRecordProps = {
  name: React.ReactNode;
  value?: React.ReactNode;
  hidden?: boolean;
  color?: { nameColor: string; valueColor: string };
  _last?: SystemStyleObject;
};

export const KubeRecord = ({
  name,
  value,
  hidden = false,
  color,
  _last = { borderBottom: "none", pb: 0 },
}: KubeRecordProps) => {
  if (hidden) return null;
  const { nameColor = "#727272", valueColor = "#555555" } = color ?? {};

  return (
    <Grid
      _last={_last}
      templateColumns={"minmax(30%, min-content) auto"}
      padding={"8px 0"}
      borderBottom={"1px solid #dfdfdf"}
    >
      <GridItem
        paddingRight={"8px"}
        overflow={"hidden"}
        textOverflow={"ellipsis"}
        color={nameColor}
        fontWeight={"bold"}
      >
        {name}
      </GridItem>
      <GridItem
        maxW={"100%"}
        minW={0}
        wordBreak={"break-word"}
        color={valueColor}
      >
        {value}
      </GridItem>
    </Grid>
  );
};
