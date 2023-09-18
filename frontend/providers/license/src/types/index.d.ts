import { MongoClient } from 'mongodb';

export * from './license';
export * from './user';

declare global {
  var mongodb: MongoClient | null;
}
