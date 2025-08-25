import { MongoClient } from 'mongodb';

declare global {
  var mongodb: MongoClient | null;
}
