import { type MongoClient } from 'mongodb';
import { type AppConfigType } from './system';
export * from './api';
export * from './session';
export * from './app';
export * from './crd';
export * from './payment';
export * from './system';
export * from './login';
export * from './valuation';
export * from './license';
export * from './region';

declare global {
  var mongodb: MongoClient | null;
  var AppConfig: AppConfigType;
  var WechatAccessToken: string | undefined;
  var WechatExpiresIn: number | undefined;
}
