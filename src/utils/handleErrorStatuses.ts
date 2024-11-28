import { APIGatewayProxyResult } from 'aws-lambda';
import { httpResponse } from './httpResponse';

export const handleErrorStatuses = (statusCode: number): APIGatewayProxyResult => {
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
};
