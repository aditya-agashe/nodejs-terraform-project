import { DynamoDB } from 'aws-sdk';
import { APIGatewayEvent, APIGatewayProxyResult } from 'aws-lambda';
import { randomUUID } from 'crypto';
import { saveLogToDynamoDB } from './dynamoDBService';

jest.mock('aws-sdk', () => {
  const mockPromise = jest.fn();
  const mockPut = jest.fn(() => ({ promise: mockPromise }));
  const mockDocumentClient = { put: mockPut };

  return {
    DynamoDB: {
      DocumentClient: jest.fn(() => mockDocumentClient),
    },
  };
});

jest.mock('crypto', () => ({
  randomUUID: jest.fn(),
}));

describe('saveLogToDynamoDB', () => {
  const mockDocumentClientInstance = new DynamoDB.DocumentClient();
  const mockPut = mockDocumentClientInstance.put as jest.Mock;
  const mockPromise = mockPut().promise as jest.Mock;
  const mockUUID = randomUUID as jest.Mock;

  const mockRequest: APIGatewayEvent = {
    path: '/weather',
    queryStringParameters: { city: 'New York' },
    body: '{"test": "data"}',
    headers: { 'Content-Type': 'application/json' },
  } as any;

  const mockResponse: APIGatewayProxyResult = {
    statusCode: 200,
    body: '{"temperature": 25, "humidity": 80}',
  };

  const mockTimestamp = '2024-11-27T12:34:56.789Z';
  const mockID = 'test-uuid';

  beforeAll(() => {
    jest.useFakeTimers({ now: new Date(mockTimestamp) });
  });

  afterAll(() => {
    jest.useRealTimers();
  });

  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.spyOn(console, 'error').mockImplementation(() => {});
    mockUUID.mockReturnValue(mockID);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should save log entry to DynamoDB successfully', async () => {
    mockPromise.mockResolvedValueOnce({});

    await saveLogToDynamoDB(mockRequest, mockResponse);

    const expectedLogEntry = {
      id: mockID,
      timestamp: mockTimestamp,
      request: {
        path: mockRequest.path,
        queryStringParameters: mockRequest.queryStringParameters,
        body: mockRequest.body,
        headers: mockRequest.headers,
      },
      response: {
        statusCode: mockResponse.statusCode,
        body: mockResponse.body,
      },
    };

    expect(mockPut).toHaveBeenCalledWith({
      TableName: 'TestWeatherLogs',
      Item: expectedLogEntry,
    });
    expect(mockPromise).toHaveBeenCalled();
    expect(console.log).toHaveBeenCalledWith('Log saved successfully:', JSON.stringify(expectedLogEntry, null, 2));
  });

  it('should handle DynamoDB errors gracefully', async () => {
    const mockError = new Error('DynamoDB error');
    mockPromise.mockRejectedValueOnce(mockError);

    await saveLogToDynamoDB(mockRequest, mockResponse);

    expect(mockPut).toHaveBeenCalled();
    expect(mockPromise).toHaveBeenCalled();
    expect(console.error).toHaveBeenCalledWith('Error saving log to DynamoDB:', mockError);
  });
});
