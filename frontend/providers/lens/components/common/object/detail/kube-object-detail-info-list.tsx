import { KubeObjectInfo } from "@/utils/kube-object-info";
import { StringKeyOf } from "type-fest";
import { KubeRecord } from "../../kube-record";
import { KubeObjectAge } from "../kube-object-age";
import { LocaleDate } from "../../local-date";
import moment from "moment-timezone";
import { KubeBadge } from "../../kube-badge";
import { Box } from "@chakra-ui/react";

export type HiddenField = StringKeyOf<KubeObjectInfo>;

export type KubeObjectInfoListProps = {
  hiddenFields?: Array<HiddenField>;
  info: KubeObjectInfo;
};

export const KubeObjectInfoList = ({
  hiddenFields = ["uid", "resourceVersion"],
  info,
}: KubeObjectInfoListProps) => {
  return (
    <>
      <KubeRecord
        hidden={
          hiddenFields.includes("creationTimestamp") || !info.creationTimestamp
        }
        name="Created"
        value={
          <>
            <KubeObjectAge
              creationTimestamp={info.creationTimestamp}
              compact={false}
            />
            {" ago "}
            {info.creationTimestamp && (
              <LocaleDate
                date={info.creationTimestamp}
                localeTimezone={moment.tz.guess()}
              />
            )}
          </>
        }
      />
      <KubeRecord
        hidden={hiddenFields.includes("name")}
        name="Name"
        value={info.name} // TODO: KubeObject Icon
      />
      <KubeRecord
        hidden={hiddenFields.includes("uid")}
        name="UID"
        value={info.uid}
      />
      <KubeRecord
        hidden={hiddenFields.includes("resourceVersion")}
        name="Resource Version"
        value={info.resourceVersion}
      />
      {info.labels.length > 0 && (
        <KubeRecord
          hidden={hiddenFields.includes("labels")}
          name="Labels"
          value={info.labels.map((label) => (
            <KubeBadge key={label} label={label} />
          ))}
        />
      )}
      {info.annotations.length > 0 && (
        <KubeRecord
          hidden={hiddenFields.includes("annotations")}
          name="Annotations"
          value={info.annotations.map((label) => (
            <KubeBadge key={label} label={label} />
          ))}
        />
      )}

      {info.finalizers.length > 0 && (
        <KubeRecord
          hidden={hiddenFields.includes("finalizers")}
          name="Finalizers"
          value={info.finalizers.map((label) => (
            <KubeBadge key={label} label={label} />
          ))}
        />
      )}
      {info.ownerRefs.length > 0 && (
        <KubeRecord
          hidden={hiddenFields.includes("ownerRefs")}
          name="ControlledBy"
          value={info.ownerRefs.map(({ name, kind }) => (
            <Box key={name}>
              {kind}{" "}
              <Box as="span" textColor={"blue.300"}>
                {name}
              </Box>
            </Box>
          ))}
        />
      )}
    </>
  );
};
