import { hasOwnProperty } from '@/k8slens/utilities';

/**
 * A function that retrieves the value of a specified key from an object.
 *
 * @param {T} obj - The object from which to retrieve the value.
 * @param {Key} key - The key of the value to retrieve.
 * @return {unknown} The value associated with the specified key.
 * @throws {Error} If the specified key is not found in the object.
 */
export function mustGetProperty<T extends object, Key extends keyof T>(obj: T, key: Key): unknown {
  if (hasOwnProperty(obj, key)) return obj[key];
  throw new Error(`${String(key)} was not found in Object ${JSON.stringify(obj)}`);
}

/**
 * Maps an array of keys to their corresponding values in an object.
 *
 * @param {object} obj - The object to get the properties from.
 * @param {Array} keys - The keys to retrieve from the object.
 * @return {Array} An array of the values corresponding to the keys in the object.
 */
export function mustGetProperties<T extends object, Key extends keyof T>(
  obj: T,
  keys: Key[]
): unknown[] {
  return keys.map((key) => mustGetProperty(obj, key));
}

/**
 * A function that retrieves a typed property from an object, and throws an error if the property value does not pass a validation function.
 *
 * @param {T} obj - The object to retrieve the property from.
 * @param {Key} key - The key of the property to retrieve.
 * @param {(value: any) => value is Type} validator - A validation function that checks if the property value is of the specified type.
 * @param {Type} typeName - The name of the type expected for the property value.
 * @returns {Type} - The value of the property if it passes the validation function.
 * @throws {Error} - Throws an error if the property value does not pass the validation function.
 */
export function mustGetTypedProperty<T extends object, Key extends keyof T, Type>(
  obj: T,
  key: Key,
  validator: (value: any) => value is Type,
  typeName: Type
): Type {
  const value = mustGetProperty(obj, key);
  if (!validator(value)) {
    throw new Error(`${String(key)} was not ${typeName} type in Object ${JSON.stringify(obj)}`);
  }
  return value;
}
