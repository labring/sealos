import { Box } from "@chakra-ui/react";
import { action, observable } from "mobx";
import { observer } from "mobx-react";
import { useEffect, useRef, useState } from "react";

export type KubeBadgeProps = {
  label: React.ReactNode;
  expandable?: boolean;
  color?: { textColor?: string; backgroundColor?: string };
};

const badgeMeta = observable({
  hasTextSelected: false,
});

export const KubeBadge = observer(
  ({ label, expandable = true, color }: KubeBadgeProps) => {
    const elem = useRef<HTMLDivElement>(null);
    const [isExpanded, setIsExpanded] = useState(false);
    const [isExpandable, setIsExpandable] = useState(false);

    useEffect(() => {
      const handleSelectionChange = () => {
        badgeMeta.hasTextSelected ||=
          (window.getSelection()?.toString().trim().length ?? 0) > 0;
      };

      document.addEventListener("selectionchange", handleSelectionChange);

      return () => {
        document.removeEventListener("selectionchange", handleSelectionChange);
      };
    }, []);

    useEffect(() => {
      const { clientWidth = 0, scrollWidth = 0 } = elem.current ?? {};

      setIsExpandable(expandable && clientWidth < scrollWidth);
    }, [expandable, elem.current]);

    const onMouseUp = action(() => {
      if (!isExpandable || badgeMeta.hasTextSelected) {
        badgeMeta.hasTextSelected = false;
      } else {
        setIsExpanded(!isExpanded);
      }
    });

    const { textColor = "black", backgroundColor = "color.vague" } =
      color ?? {};

    return (
      <Box
        display={"inline-block"}
        onMouseUp={onMouseUp}
        ref={elem}
        maxW={"100%"}
        borderRadius={"2px"}
        fontSize={"0.8rem"}
        cursor={"pointer"}
        lineHeight={"normal"}
        padding={"0.2rem 0.4rem"}
        whiteSpace={!isExpanded ? "nowrap" : "normal"}
        overflow={!isExpanded ? "hidden" : "visible"}
        textOverflow={!isExpanded ? "ellipsis" : "initial"}
        margin={"0 2px 0 0"}
        bgColor={backgroundColor}
      >
        <Box as="span" textColor={textColor}>
          {label}
        </Box>
      </Box>
    );
  }
);
