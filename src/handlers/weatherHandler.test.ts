import { fetchCurrentWeatherData, fetchHistoricalWeatherData } from '../services/weatherService';
import { saveLogToDynamoDB } from '../services/dynamoDBService';
import { httpResponse } from '../utils/httpResponse';
import { APIGatewayEvent } from 'aws-lambda';
import { fetchWeatherData } from './weatherHandler';
import { getLatLon } from '../services/geocodingService';

global.fetch = jest.fn();
const mockedHttpResponse = httpResponse as jest.Mock;
const mockedGetLatLon = getLatLon as jest.Mock;
const mockedFetchCurrentWeatherData = fetchCurrentWeatherData as jest.Mock;
const mockedFetchHistoricalWeatherData = fetchHistoricalWeatherData as jest.Mock;

jest.mock('../services/geocodingService', () => ({
  getLatLon: jest.fn(),
}));

jest.mock('../services/weatherService', () => ({
  fetchCurrentWeatherData: jest.fn(),
  fetchHistoricalWeatherData: jest.fn(),
}));

jest.mock('../services/dynamoDBService', () => ({
  saveLogToDynamoDB: jest.fn(),
}));

jest.mock('../utils/httpResponse', () => ({
  httpResponse: jest.fn(),
}));

describe('fetchWeatherData', () => {
  const mockEvent = {
    pathParameters: { city: 'New York' },
    resource: '/weather/{city}',
  } as unknown as APIGatewayEvent;

  const coordinate = { lat: 40.7128, lon: -74.006 };

  afterEach(() => {
    jest.clearAllMocks();
    mockedHttpResponse.mockReset();
    mockedGetLatLon.mockReset();
    mockedFetchCurrentWeatherData.mockReset();
    mockedFetchHistoricalWeatherData.mockReset();
  });

  it('should return 400 if city is missing', async () => {
    const eventWithoutCity = { ...mockEvent, pathParameters: {} } as APIGatewayEvent;
    const mockResponse = { statusCode: 400, body: 'City parameter is required' };
    mockedHttpResponse.mockReturnValue(mockResponse);

    const result = await fetchWeatherData(eventWithoutCity);

    expect(httpResponse).toHaveBeenCalledWith(400, 'City parameter is required');
    expect(saveLogToDynamoDB).toHaveBeenCalledWith(eventWithoutCity, mockResponse);
    expect(result).toEqual(mockResponse);
  });

  it('should fetch current weather data and save the log', async () => {
    const mockResponse = { statusCode: 200, body: 'Current weather data' };
    mockedGetLatLon.mockResolvedValue(coordinate);
    mockedFetchCurrentWeatherData.mockResolvedValue(mockResponse);

    const result = await fetchWeatherData(mockEvent);

    expect(getLatLon).toHaveBeenCalledWith('New York');
    expect(fetchCurrentWeatherData).toHaveBeenCalledWith(coordinate);
    expect(saveLogToDynamoDB).toHaveBeenCalledWith(mockEvent, mockResponse);
    expect(result).toEqual(mockResponse);
  });

  it('should fetch historical weather data and save the log', async () => {
    const historicalEvent = { ...mockEvent, resource: '/weather/history/{city}' } as APIGatewayEvent;
    const mockResponse = { statusCode: 200, body: 'Historical weather data' };
    mockedGetLatLon.mockResolvedValue(coordinate);
    mockedFetchHistoricalWeatherData.mockResolvedValue(mockResponse);

    const result = await fetchWeatherData(historicalEvent);

    expect(getLatLon).toHaveBeenCalledWith('New York');
    expect(fetchHistoricalWeatherData).toHaveBeenCalledWith(historicalEvent, coordinate);
    expect(saveLogToDynamoDB).toHaveBeenCalledWith(historicalEvent, mockResponse);
    expect(result).toEqual(mockResponse);
  });

  it('should return 501 for unsupported resource', async () => {
    const unsupportedEvent = { ...mockEvent, resource: '/unsupported/resource' } as APIGatewayEvent;
    const mockResponse = { statusCode: 501, body: 'This functionality is not yet implemented.' };
    mockedHttpResponse.mockReturnValue(mockResponse);

    const result = await fetchWeatherData(unsupportedEvent);

    expect(httpResponse).toHaveBeenCalledWith(501, 'This functionality is not yet implemented.');
    expect(result).toEqual(mockResponse);
  });

  it('should return 500 if an error occurs', async () => {
    const mockError = new Error('Test error');
    const mockResponse = { statusCode: 500, body: 'Failed to fetch weather data' };
    mockedGetLatLon.mockRejectedValue(mockError);
    mockedHttpResponse.mockReturnValue(mockResponse);

    const result = await fetchWeatherData(mockEvent);

    expect(getLatLon).toHaveBeenCalledWith('New York');
    expect(saveLogToDynamoDB).toHaveBeenCalledWith(mockEvent, mockResponse);
    expect(result).toEqual(mockResponse);
  });
});
