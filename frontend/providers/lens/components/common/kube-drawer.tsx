import {
  Drawer,
  DrawerBody,
  DrawerFooter,
  DrawerHeader,
  DrawerOverlay,
  DrawerContent,
  DrawerCloseButton,
} from "@chakra-ui/react";
import { MutableRefObject } from "react";

export type KubeDrawerProps = {
  header: React.ReactNode;
  footer?: React.ReactNode;
  isOpen: boolean;
  onClose: () => void;
  finalFocusRef?: MutableRefObject<any>;
};

export const KubeDrawer = ({
  props,
  children,
}: {
  props: KubeDrawerProps;
  children: React.ReactNode;
}) => {
  const { isOpen, onClose, finalFocusRef, header, footer } = props;
  return (
    <Drawer
      isOpen={isOpen}
      placement="right"
      onClose={onClose}
      finalFocusRef={finalFocusRef}
      size={"sm"}
    >
      <DrawerOverlay />
      <DrawerContent>
        <DrawerCloseButton />
        <DrawerHeader>{header}</DrawerHeader>
        <DrawerBody>{children}</DrawerBody>
        <DrawerFooter>{footer}</DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
};
