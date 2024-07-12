import Cron from 'croner';
import { MongoClient } from 'mongodb';

declare global {
  var mongodb: MongoClient | null;
  var cronJobWorkOrders: Cron;
}
