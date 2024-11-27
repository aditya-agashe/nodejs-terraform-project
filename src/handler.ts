import { APIGatewayEvent, Context, Callback, Handler, APIGatewayProxyResult } from 'aws-lambda';

const openWeatherMapApiKey = process.env.OPEN_WEATHER_MAP_API_KEY;

const fetchWeatherData = async (event: APIGatewayEvent): Promise<APIGatewayProxyResult> => {
  console.log('Received event:', JSON.stringify(event, null, 2));
  const city = event.pathParameters?.city;
  if (!city) {
    console.error('City parameter is missing');
    return httpResponse(400, 'City parameter is required');
  }
  try {
    const coordinate: Coordinate = await getLatLon(city);
    if (event.resource === '/weather/{city}') {
      console.log('call fetchCurrentWeatherData');
      return fetchCurrentWeatherData(coordinate);
    } else if (event.resource === '/weather/history/{city}') {
      console.log('call fetchHistoricalWeatherData');
      return fetchHistoricalWeatherData(event, coordinate);
    } else {
      return httpResponse(501, 'This functionality is not yet implemented.');
    }
  } catch (error) {
    console.error('There was an error fetching the current weather data:', error);
    return httpResponse(500, 'Failed to fetch weather data');
  }
};

const fetchCurrentWeatherData = async (coordinate: Coordinate): Promise<APIGatewayProxyResult> => {
  const url = `https://api.openweathermap.org/data/3.0/onecall?lat=${coordinate.lat}&lon=${coordinate.lon}&appid=${openWeatherMapApiKey}`;
  const response = await fetch(url);
  if (!response.ok) {
    return handleErrorStatuses(response.status);
  }
  const data = await response.json();
  console.log(data.current);
  return httpResponse(200, JSON.stringify(data.current));
};

const fetchHistoricalWeatherData = async (event: APIGatewayEvent, coordinate: Coordinate): Promise<APIGatewayProxyResult> => {
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

const getLatLon = async (city: string): Promise<Coordinate> => {
  const geocodingURl = `http://api.openweathermap.org/geo/1.0/direct?q=${city}&appid=${openWeatherMapApiKey}`;

  try {
    const response = await fetch(geocodingURl);
    if (!response.ok) {
      throw new Error(`Geocoding api endpoint returned response: ${response.status}`);
    }

    const data: Array<Coordinate> = await response.json();

    if (data.length === 0) {
      console.log(`No coordinates found for city: ${city}`);
      throw new Error(`No coordinates found for city: ${city}`);
    }

    const { lat, lon } = data[0];
    console.log(`Latitude: ${lat}, Longitude: ${lon}`);
    return { lat, lon };
  } catch (error) {
    console.error(`There was an error fetching coordinates for ${city}`, error);
    throw new Error(`There was an error fetching coordinates for ${city}`);
  }
};

export const lambdaHandler: Handler = async (event: APIGatewayEvent, context: Context, callback: Callback) => {
  return await fetchWeatherData(event);
};

const httpResponse = (statusCode: number, message: string): APIGatewayProxyResult => {
  return {
    statusCode: statusCode,
    headers: {
      'Content-Type': 'application/json',
    },
    body: message,
  };
};

function handleErrorStatuses(statusCode: number): APIGatewayProxyResult {
  switch (statusCode) {
    case 400:
      return httpResponse(400, JSON.stringify({ error: 'Bad Request' }));
    case 401:
      return httpResponse(401, JSON.stringify({ error: 'Unauthorized' }));
    case 404:
      return httpResponse(404, JSON.stringify({ error: 'Not Found' }));
    case 429:
      return httpResponse(429, JSON.stringify({ error: 'Too Many Requests' }));
    default:
      if (statusCode >= 500) {
        return httpResponse(statusCode, JSON.stringify({ error: 'Server Error' }));
      }
      return httpResponse(statusCode, JSON.stringify({ error: `Unexpected Error: ${statusCode}` }));
  }
}
