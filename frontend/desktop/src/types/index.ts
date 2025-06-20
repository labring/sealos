import { Umami } from '@umami/node';
import { Cron } from 'croner';
import { type MongoClient } from 'mongodb';
import { Transporter } from 'nodemailer';
import SMTPPool from 'nodemailer/lib/smtp-pool';
import { type AppConfigType } from './system';
export * from './api';
export * from './app';
export * from './crd';
export * from './license';
export * from './login';
export * from './payment';
export * from './region';
export * from './session';
export * from './system';
export * from './tools';
export * from './loginFailureMesage';
declare global {
  var mongodb: MongoClient | null;
  var AppConfig: AppConfigType;
  var commitCroner: Cron | undefined;
  var finishCroner: Cron | undefined;
  var runCroner: Cron | undefined;
  var WechatAccessToken: string | undefined;
  var WechatExpiresIn: number | undefined;
  var nodemailer: Transporter<SMTPPool.SentMessageInfo> | undefined;
  var umami: Umami | undefined;
  var dataLayer: { push: Function } | null;
}
