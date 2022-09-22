const cleanName = (name: string): string => {
  return name.replace(/ /g, '-').toLowerCase();
};

export { cleanName };
