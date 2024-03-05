type DetailDrawerProps<K> = {
  obj: K | null;
  onClose: () => void;
  open: boolean;
};
