import { APIGatewayEvent, APIGatewayProxyResult } from 'aws-lambda';
import { httpResponse } from '../utils/httpResponse';
import { handleErrorStatuses } from '../utils/handleErrorStatuses';

const openWeatherMapApiKey = process.env.OPEN_WEATHER_MAP_API_KEY;

export const fetchCurrentWeatherData = async (coordinate: Coordinate): Promise<APIGatewayProxyResult> => {
  const url = `https://api.openweathermap.org/data/3.0/onecall?lat=${coordinate.lat}&lon=${coordinate.lon}&appid=${openWeatherMapApiKey}`;
  const response = await fetch(url);
  if (!response.ok) {
    return handleErrorStatuses(response.status);
  }
  const data = await response.json();
  console.log(data.current);
  return httpResponse(200, JSON.stringify(data.current));
};

export const fetchHistoricalWeatherData = async (event: APIGatewayEvent, coordinate: Coordinate): Promise<APIGatewayProxyResult> => {
  const timestamp = event.queryStringParameters?.timestamp;
  if (!timestamp) {
    return httpResponse(400, JSON.stringify({ error: 'Missing query parameter: timestamp' }));
  }
  const parsedTimestamp = Number(timestamp);
  if (isNaN(parsedTimestamp)) {
    return httpResponse(400, JSON.stringify({ error: 'Invalid timestamp format. Must be a valid number.' }));
  }
  const url = `https://api.openweathermap.org/data/3.0/onecall/timemachine?lat=${coordinate.lat}&lon=${coordinate.lon}&dt=${timestamp}&appid=${openWeatherMapApiKey}`;
  const response = await fetch(url);
  if (!response.ok) {
    return handleErrorStatuses(response.status);
  }
  const data = await response.json();
  console.log(data);
  return httpResponse(200, JSON.stringify(data));
};
