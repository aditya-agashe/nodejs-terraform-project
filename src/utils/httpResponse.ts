import { APIGatewayProxyResult } from 'aws-lambda';

export const httpResponse = (statusCode: number, message: string): APIGatewayProxyResult => {
  return {
    statusCode: statusCode,
    headers: {
      'Content-Type': 'application/json',
    },
    body: message,
  };
};
