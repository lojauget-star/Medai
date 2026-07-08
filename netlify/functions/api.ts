import serverless from 'serverless-http';
import { app } from '../../server';

const serverlessHandler = serverless(app);

export const handler = async (event: any, context: any) => {
  context.callbackWaitsForEmptyEventLoop = false;
  return await serverlessHandler(event, context);
};
