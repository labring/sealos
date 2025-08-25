import { MongoClient } from 'mongodb';

export * from './license';
export * from './user';
export * from './notification';

declare global {
  var mongodb: MongoClient | null;
}
