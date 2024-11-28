terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.77.0"
    }
    random = {
      source  = "hashicorp/random"
      version = "~> 3.6.3"
    }
    archive = {
      source  = "hashicorp/archive"
      version = "~> 2.6.0"
    }
  }
  required_version = "~> 1.0"
}

provider "aws" {
  region = "ap-southeast-2"
}

resource "random_pet" "weather_lambda_bucket_name" {
  prefix = "lambda"
  length = 2
}

resource "aws_s3_bucket" "weather_lambda_bucket" {
  bucket        = random_pet.weather_lambda_bucket_name.id
  force_destroy = true
}

resource "aws_s3_bucket_public_access_block" "weather_lambda_bucket" {
  bucket = aws_s3_bucket.weather_lambda_bucket.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_iam_role" "weather_lambda_role" {
  name = "weather-lambda-execution-role"
  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action = "sts:AssumeRole"
      Effect = "Allow"
      Principal = {
        Service = "lambda.amazonaws.com"
      }
    }]
  })
}

resource "aws_iam_role_policy_attachment" "weather_lambda_basic_execution" {
  role       = aws_iam_role.weather_lambda_role.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}

resource "aws_lambda_function" "weather_lambda" {
  function_name    = "weather-lambda"
  s3_bucket        = aws_s3_bucket.weather_lambda_bucket.id
  s3_key           = aws_s3_object.weather_lambda_archive.key
  runtime          = "nodejs20.x"
  role             = aws_iam_role.weather_lambda_role.arn
  handler          = "dist/handler.lambdaHandler"
  source_code_hash = data.archive_file.weather_lambda_archive.output_base64sha256
  timeout = 10
}

resource "aws_cloudwatch_log_group" "weather_lambda_cloudwatch_log_group" {
  name = "/aws/lambda/${aws_lambda_function.weather_lambda.function_name}"
  retention_in_days = 14
}

data "archive_file" "weather_lambda_archive" {
  type = "zip"

  source_dir  = "../${path.module}/dist"
  output_path = "../${path.module}/terraform/handler.zip"
}

resource "aws_s3_object" "weather_lambda_archive" {
  bucket = aws_s3_bucket.weather_lambda_bucket.id

  key    = "weather_lambda.zip"
  source = data.archive_file.weather_lambda_archive.output_path

  etag = filemd5(data.archive_file.weather_lambda_archive.output_path)
}

resource "aws_apigatewayv2_api" "weather_http_api" {
  name          = "weather-api"
  protocol_type = "HTTP"
  description   = "API for fetching weather information."
}

resource "aws_apigatewayv2_stage" "default" {
  api_id      = aws_apigatewayv2_api.weather_http_api.id
  name        = "$default"
  auto_deploy = true

  access_log_settings {
    destination_arn = aws_cloudwatch_log_group.weather_lambda_cloudwatch_log_group.arn

    format = jsonencode({
      requestId               = "$context.requestId"
      sourceIp                = "$context.identity.sourceIp"
      requestTime             = "$context.requestTime"
      protocol                = "$context.protocol"
      httpMethod              = "$context.httpMethod"
      resourcePath            = "$context.resourcePath"
      routeKey                = "$context.routeKey"
      status                  = "$context.status"
      responseLength          = "$context.responseLength"
      integrationErrorMessage = "$context.integrationErrorMessage"
      }
    )
  }
}

resource "aws_apigatewayv2_integration" "weather_lambda_integration" {
  api_id           = aws_apigatewayv2_api.weather_http_api.id
  integration_type = "AWS_PROXY"
  integration_uri  = aws_lambda_function.weather_lambda.invoke_arn
}

resource "aws_apigatewayv2_route" "current_lambda_route" {
  api_id    = aws_apigatewayv2_api.weather_http_api.id
  route_key = "GET /weather/{city}"
  target    = "integrations/${aws_apigatewayv2_integration.weather_lambda_integration.id}"
}

resource "aws_apigatewayv2_route" "history_lambda_route" {
  api_id    = aws_apigatewayv2_api.weather_http_api.id
  route_key = "GET /weather/history/{city}"
  target    = "integrations/${aws_apigatewayv2_integration.weather_lambda_integration.id}"
}

resource "aws_lambda_permission" "weather_api_gw_lambda_permission" {
  statement_id  = "AllowExecutionFromAPIGateway"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.weather_lambda.function_name
  principal     = "apigateway.amazonaws.com"

  source_arn = "${aws_apigatewayv2_api.weather_http_api.execution_arn}/*/*"
}

resource "aws_dynamodb_table" "weather_logs" {
  name           = "WeatherLogs"
  billing_mode   = "PROVISIONED"
  read_capacity  = 20
  write_capacity = 20
  hash_key       = "id"
  range_key      = "timestamp"

  attribute {
    name = "id"
    type = "S"
  }

  attribute {
    name = "timestamp"
    type = "S"
  }

  tags = {
    Name = "WeatherLogsTable"
    Environment = "dev"
  }
}

resource "aws_iam_policy" "dynamodb_write_access_policy" {
  name   = "DynamoDBWeatherLogsWriteAccess"
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = [
          "dynamodb:PutItem",
        ],
        Effect = "Allow",
        Resource = "${aws_dynamodb_table.weather_logs.arn}"
      },
    ]
  })
}

resource "aws_iam_role_policy_attachment" "dynamodb_access" {
  role       = aws_iam_role.weather_lambda_role.name 
  policy_arn = aws_iam_policy.dynamodb_write_access_policy.arn
}

output "api_endpoint" {
  value = aws_apigatewayv2_stage.default.invoke_url
}
