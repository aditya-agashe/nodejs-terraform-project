import { APIGatewayEvent, APIGatewayProxyResult } from 'aws-lambda';
import { DynamoDB } from 'aws-sdk';
import { randomUUID } from 'crypto';

const dynamoDB = new DynamoDB.DocumentClient();
const tableName = process.env.WEATHER_LOGS_TABLE || 'WeatherLogs';

export const saveLogToDynamoDB = async (request: APIGatewayEvent, response: APIGatewayProxyResult): Promise<void> => {
  const logEntry = {
    id: randomUUID(),
    timestamp: new Date().toISOString(),
    request: {
      path: request.path,
      queryStringParameters: request.queryStringParameters,
      body: request.body,
      headers: request.headers,
    },
    response: {
      statusCode: response.statusCode,
      body: response.body,
    },
  };

  try {
    await dynamoDB
      .put({
        TableName: tableName,
        Item: logEntry,
      })
      .promise();

    console.log('Log saved successfully:', JSON.stringify(logEntry, null, 2));
  } catch (error) {
    console.error('Error saving log to DynamoDB:', error);
  }
};
