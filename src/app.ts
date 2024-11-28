import { APIGatewayEvent, Callback, Context, Handler } from 'aws-lambda';
import { fetchWeatherData } from './handlers/weatherHandler';

export const lambdaHandler: Handler = async (event: APIGatewayEvent, context: Context, callback: Callback) => {
  return await fetchWeatherData(event);
};
