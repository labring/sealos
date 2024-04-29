import { type MongoClient } from 'mongodb';
import { type AppConfigType } from './system';
import { Cron } from 'croner';
import { Transporter } from 'nodemailer';
import SMTPPool from 'nodemailer/lib/smtp-pool';
export * from './api';
export * from './session';
export * from './app';
export * from './crd';
export * from './payment';
export * from './system';
export * from './login';
export * from './tools';
export * from './license';
export * from './region';

declare global {
  var mongodb: MongoClient | null;
  var AppConfig: AppConfigType;
  var commitCroner: Cron | undefined;
  var finishCroner: Cron | undefined;
  var runCroner: Cron | undefined;
  var WechatAccessToken: string | undefined;
  var WechatExpiresIn: number | undefined;
  var nodemailer: Transporter<SMTPPool.SentMessageInfo> | undefined;
}
