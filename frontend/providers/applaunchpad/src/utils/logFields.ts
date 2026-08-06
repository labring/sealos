export const getLogFieldLabel = (field: string) => {
  return field === '_time' || field === '_msg' ? field.substring(1) : field;
};
