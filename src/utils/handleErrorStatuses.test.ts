import { handleErrorStatuses } from './handleErrorStatuses';
import { APIGatewayProxyResult } from 'aws-lambda';

describe('handleErrorStatuses', () => {
  it('should return a 400 Bad Request response', () => {
    const expectedResponse: APIGatewayProxyResult = {
      statusCode: 400,
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ error: 'Bad Request' }),
    };

    expect(handleErrorStatuses(400)).toEqual(expectedResponse);
  });

  it('should return a 401 Unauthorized response', () => {
    const expectedResponse: APIGatewayProxyResult = {
      statusCode: 401,
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ error: 'Unauthorized' }),
    };

    const result = handleErrorStatuses(401);
    expect(result).toEqual(expectedResponse);
  });

  it('should return a 404 Not Found response', () => {
    const expectedResponse: APIGatewayProxyResult = {
      statusCode: 404,
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ error: 'Not Found' }),
    };
    const result = handleErrorStatuses(404);
    expect(result).toEqual(expectedResponse);
  });

  it('should return a 429 Too Many Requests response', () => {
    const expectedResponse: APIGatewayProxyResult = {
      statusCode: 429,
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ error: 'Too Many Requests' }),
    };
    const result = handleErrorStatuses(429);
    expect(result).toEqual(expectedResponse);
  });

  it('should return a 500 Server Error response for status codes >= 500', () => {
    const statusCode = 500;
    const expectedResponse: APIGatewayProxyResult = {
      statusCode,
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ error: 'Server Error' }),
    };
    const result = handleErrorStatuses(statusCode);
    expect(result).toEqual(expectedResponse);
  });

  it('should return a generic unexpected error response for other status codes', () => {
    const statusCode = 418;
    const expectedResponse: APIGatewayProxyResult = {
      statusCode,
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ error: `Unexpected Error: ${statusCode}` }),
    };
    const result = handleErrorStatuses(statusCode);
    expect(result).toEqual(expectedResponse);
  });
});
