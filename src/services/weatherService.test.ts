import { httpResponse } from '../utils/httpResponse';
import { APIGatewayEvent } from 'aws-lambda';
import { fetchCurrentWeatherData, fetchHistoricalWeatherData } from './weatherService';
import { handleErrorStatuses } from '../utils/handleErrorStatuses';

global.fetch = jest.fn();
const mockedFetch = fetch as jest.Mock;
const mockedHttpResponse = httpResponse as jest.Mock;
const mockedHandleErrorStatuses = handleErrorStatuses as jest.Mock;

jest.mock('../utils/httpResponse', () => ({
  httpResponse: jest.fn(),
}));
jest.mock('../utils/handleErrorStatuses', () => ({
  handleErrorStatuses: jest.fn(),
}));

describe('Weather Service', () => {
  const coordinate = { lat: 40.7128, lon: -74.006 };
  const mockEvent: APIGatewayEvent = {
    queryStringParameters: { timestamp: '1698508800' },
  } as any;

  afterEach(() => {
    jest.clearAllMocks();
    mockedFetch.mockReset();
    mockedHttpResponse.mockReset();
    mockedHandleErrorStatuses.mockReset();
  });

  describe('fetchCurrentWeatherData', () => {
    it('should return 200 with current weather data', async () => {
      const mockResponse = { current: { temperature: 25, humidity: 80 } };

      mockedFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      } as Response);

      mockedHttpResponse.mockReturnValue({
        statusCode: 200,
        body: JSON.stringify(mockResponse.current),
      });

      const result = await fetchCurrentWeatherData(coordinate);

      expect(mockedFetch).toHaveBeenCalledWith(
        `https://api.openweathermap.org/data/3.0/onecall?lat=${coordinate.lat}&lon=${coordinate.lon}&appid=test-api-key`
      );
      expect(result).toEqual({
        statusCode: 200,
        body: JSON.stringify(mockResponse.current),
      });
    });

    it('should return error response for non-OK fetch', async () => {
      mockedFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
      } as Response);

      mockedHandleErrorStatuses.mockReturnValue({
        statusCode: 404,
        body: JSON.stringify({ error: 'Not Found' }),
      });

      const result = await fetchCurrentWeatherData(coordinate);

      expect(mockedFetch).toHaveBeenCalled();
      expect(handleErrorStatuses).toHaveBeenCalledWith(404);
      expect(result).toEqual({
        statusCode: 404,
        body: JSON.stringify({ error: 'Not Found' }),
      });
    });
  });

  describe('fetchHistoricalWeatherData', () => {
    it('should return 200 with historical weather data', async () => {
      const mockResponse = { temperature: 20, humidity: 70 };

      mockedFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      } as Response);

      mockedHttpResponse.mockReturnValue({
        statusCode: 200,
        body: JSON.stringify(mockResponse),
      });

      const result = await fetchHistoricalWeatherData(mockEvent, coordinate);

      expect(mockedFetch).toHaveBeenCalledWith(
        `https://api.openweathermap.org/data/3.0/onecall/timemachine?lat=${coordinate.lat}&lon=${coordinate.lon}&dt=${mockEvent.queryStringParameters?.timestamp}&appid=test-api-key`
      );
      expect(result).toEqual({
        statusCode: 200,
        body: JSON.stringify(mockResponse),
      });
    });

    it('should return 400 if timestamp is missing', async () => {
      const invalidEvent = { queryStringParameters: {} } as APIGatewayEvent;

      mockedHttpResponse.mockReturnValue({
        statusCode: 400,
        body: JSON.stringify({ error: 'Missing query parameter: timestamp' }),
      });

      const result = await fetchHistoricalWeatherData(invalidEvent, coordinate);

      expect(httpResponse).toHaveBeenCalledWith(400, JSON.stringify({ error: 'Missing query parameter: timestamp' }));
      expect(result).toEqual({
        statusCode: 400,
        body: JSON.stringify({ error: 'Missing query parameter: timestamp' }),
      });
    });

    it('should return 400 if timestamp is empty', async () => {
      const invalidEvent = { queryStringParameters: { timestamp: '' } } as unknown as APIGatewayEvent;

      mockedHttpResponse.mockReturnValue({
        statusCode: 400,
        body: JSON.stringify({ error: 'Missing query parameter: timestamp' }),
      });

      const result = await fetchHistoricalWeatherData(invalidEvent, coordinate);

      expect(httpResponse).toHaveBeenCalledWith(400, JSON.stringify({ error: 'Missing query parameter: timestamp' }));
      expect(result).toEqual({
        statusCode: 400,
        body: JSON.stringify({ error: 'Missing query parameter: timestamp' }),
      });
    });

    it('should return 400 if timestamp is invalid', async () => {
      const invalidEvent = {
        queryStringParameters: { timestamp: 'invalid' },
      } as unknown as APIGatewayEvent;

      mockedHttpResponse.mockReturnValue({
        statusCode: 400,
        body: JSON.stringify({ error: 'Invalid timestamp format. Must be a valid number.' }),
      });

      const result = await fetchHistoricalWeatherData(invalidEvent, coordinate);

      expect(httpResponse).toHaveBeenCalledWith(400, JSON.stringify({ error: 'Invalid timestamp format. Must be a valid number.' }));
      expect(result).toEqual({
        statusCode: 400,
        body: JSON.stringify({ error: 'Invalid timestamp format. Must be a valid number.' }),
      });
    });

    it('should return error response for non-OK fetch', async () => {
      mockedFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
      } as Response);

      mockedHandleErrorStatuses.mockReturnValue({
        statusCode: 500,
        body: JSON.stringify({ error: 'Server Error' }),
      });

      const result = await fetchHistoricalWeatherData(mockEvent, coordinate);

      expect(mockedFetch).toHaveBeenCalled();
      expect(handleErrorStatuses).toHaveBeenCalledWith(500);
      expect(result).toEqual({
        statusCode: 500,
        body: JSON.stringify({ error: 'Server Error' }),
      });
    });
  });
});
