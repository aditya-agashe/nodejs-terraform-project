Deployment:

1. Ensure that AWS CLI has been setup along with secret and access keys. To verify run command
   aws sts get-caller-identity

2. To build the package. Run command
   npm run build

3. To deploy Terraform. Run command in following order
   terraform -chdir=terraform init
   terraform -chdir=terraform plan
   terraform -chdir=terraform apply

   Make a note of the api endpoint url in the Outputs

4. Replace <your_api_key> with your Open Weather Map API Key. Ensure to run the command AFTER EVERY Terraform to setup environmant variable.
   aws lambda update-function-configuration --function-name weather-lambda --environment "Variables={OPEN_WEATHER_MAP_API_KEY=<your_api_key>}"

Assumptions:

1. I am ignoring the Country. So city London might be in US or UK or somewhere else. Same goes for city of Melbourne. That is not accurate.

2. Best practice is to store the secrets in AWS Secrets Manager. I am saving here in an environment variable.
