import * as z from 'zod';

export const editPasswordPattern = /^(?![!-])[A-Za-z\d~`!@#%^&*()\-_=+|:,<.>\/? ]{8,32}$/;

export const editPasswordSchemaErrorMessage =
  'Password must be 8-32 characters long and can not start with ! or -.';

export const editPasswordSchema = z
  .string()
  .min(8, editPasswordSchemaErrorMessage)
  .max(32, editPasswordSchemaErrorMessage)
  .regex(editPasswordPattern, editPasswordSchemaErrorMessage);
