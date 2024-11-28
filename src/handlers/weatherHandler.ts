import { APIGatewayEvent, APIGatewayProxyResult } from 'aws-lambda';
import { httpResponse } from '../utils/httpResponse';
import { getLatLon } from '../services/geocodingService';
import { fetchCurrentWeatherData, fetchHistoricalWeatherData } from '../services/weatherService';
import { saveLogToDynamoDB } from '../services/dynamoDBService';

export const fetchWeatherData = async (event: APIGatewayEvent): Promise<APIGatewayProxyResult> => {
  console.log('Received event:', JSON.stringify(event, null, 2));
  const city = event.pathParameters?.city;

  if (!city) {
    console.error('City parameter is missing');
    const response = httpResponse(400, 'City parameter is required');
    await saveLogToDynamoDB(event, response);
    return response;
  }

  try {
    const coordinate: Coordinate = await getLatLon(city);
    let response: APIGatewayProxyResult;
    if (event.resource === '/weather/{city}') {
      console.log('call fetchCurrentWeatherData');
      response = await fetchCurrentWeatherData(coordinate);
    } else if (event.resource === '/weather/history/{city}') {
      console.log('call fetchHistoricalWeatherData');
      response = await fetchHistoricalWeatherData(event, coordinate);
    } else {
      return httpResponse(501, 'This functionality is not yet implemented.');
    }
    await saveLogToDynamoDB(event, response);
    return response;
  } catch (error: any) {
    console.error('There was an error fetching the current weather data:', error);
    const response = httpResponse(500, error.message);
    await saveLogToDynamoDB(event, response);
    return response;
  }
};
