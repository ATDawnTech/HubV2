export function diffObjects(obj1, obj2) {
  const result = {};
  for (const key in obj1) {
    if (
      obj1.hasOwnProperty(key) &&
      obj1[key] !== obj2[key] &&
      obj1[key] !== undefined &&
      obj2[key] !== undefined
    ) {
      result[key] = {
        obj1: obj1[key],
        obj2: obj2[key],
      };
    }
  }
  return result;
}
