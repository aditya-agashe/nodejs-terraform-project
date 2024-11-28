import { getLatLon } from './geocodingService';

global.fetch = jest.fn();
const mockedFetch = fetch as jest.Mock;

describe('getLatLon', () => {
  beforeEach(() => {});

  afterEach(() => {
    jest.clearAllMocks();
    mockedFetch.mockReset();
  });

  it('should return coordinates for a valid city', async () => {
    const mockResponse: Array<Coordinate> = [{ lat: 40.7128, lon: -74.006 }];
    mockedFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse,
    });

    const city = 'New York';
    const result = await getLatLon(city);

    expect(fetch).toHaveBeenCalledWith(`http://api.openweathermap.org/geo/1.0/direct?q=${city}&appid=test-api-key`);
    expect(result).toEqual({ lat: 40.7128, lon: -74.006 });
  });

  it('should throw an error if the response is not OK', async () => {
    mockedFetch.mockResolvedValueOnce({
      ok: false,
      status: 404,
      statusText: 'Not Found',
      json: async () => '',
    } as Response);

    const city = 'InvalidCity';

    await expect(getLatLon(city)).rejects.toThrow('Geocoding api endpoint returned response: 404');
  });

  it('should throw an error if the response data is empty', async () => {
    mockedFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => [],
    });
    const city = 'NoDataCity';
    await expect(getLatLon(city)).rejects.toThrow('No coordinates found for city: NoDataCity');
  });
});
