/**
 * obj to query
 */
export const obj2Query = (obj: Record<string, string | number>) => {
  let str = '';
  Object.entries(obj).forEach(([key, val]) => {
    if (val) {
      str += `${key}=${val}&`;
    }
  });

  return str.slice(0, str.length - 1);
};
