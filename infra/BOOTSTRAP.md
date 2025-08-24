# Amplify/CDK Bootstrap Remediation (us-east-1)

Problem
- Amplify backend deploy (ampx pipeline-deploy) fails with: BootstrapNotDetectedError – "This AWS account and region has not been bootstrapped."
- Reason: The AWS CDK bootstrap stack (qualifier hnb659fds) is not present in account 654654446418, region us-east-1.

What bootstrapping does
- Creates the CDKToolkit stack which provisions an S3 bucket, ECR repo, and stores a version SSM parameter at /cdk-bootstrap/hnb659fds/version.
- Amplify (via ampx/CDK) requires this to publish assets and deploy infrastructure.

Prerequisites
- An AWS principal with permissions to create/update CloudFormation stacks and the resources in the bootstrap: CloudFormation, S3, ECR, IAM, and SSM Parameter Store (CAPABILITY_NAMED_IAM required).

Quick verification (before)
- Check if the SSM parameter exists:
  - aws ssm get-parameter --region us-east-1 --name "/cdk-bootstrap/hnb659fds/version"
  - If NotFound, the environment is not bootstrapped.

Bootstrap using AWS CDK CLI (recommended)
- Install CDK v2 CLI (if not installed):
  - npm i -g aws-cdk@2
- Run bootstrap with the expected qualifier (hnb659fds):
  - cdk bootstrap --qualifier hnb659fds aws://654654446418/us-east-1
- The command will create/upgrade the CDKToolkit stack and write the SSM parameter.

Alternative: Bootstrap via CloudFormation directly
- You can deploy the official CDK bootstrap template using CloudFormation. This is advanced; prefer the CLI above.
- Reference template (ensure it matches your CDK/ampx env; example version shown):
  - Template URL (example CDK v2.x): https://raw.githubusercontent.com/aws/aws-cdk/v2.152.0/packages/aws-cdk/lib/api/bootstrap/bootstrap-template.yaml
- Deploy using CLI (you must provide parameters consistent with qualifier hnb659fds):
  - aws cloudformation deploy \
      --region us-east-1 \
      --stack-name CDKToolkit \
      --template-file bootstrap-template.yaml \
      --capabilities CAPABILITY_NAMED_IAM \
      --parameter-overrides \
        Qualifier=hnb659fds \
        FileAssetsBucketName=cdk-hnb659fds-assets-654654446418-us-east-1 \
        TrustedAccounts= \
        TrustedAccountsForLookup=

Verification (after)
- Confirm the SSM parameter now exists and is readable:
  - aws ssm get-parameter --region us-east-1 --name "/cdk-bootstrap/hnb659fds/version"
- Confirm the CDKToolkit stack status:
  - aws cloudformation describe-stacks --region us-east-1 --stack-name CDKToolkit --query "Stacks[0].[StackStatus,StackId]"

Re-run Amplify build
- Start a new job for main:
  - aws amplify start-job --region us-east-1 --app-id d2wwjdgjliumng --branch-name main --job-type RELEASE
- Watch status:
  - aws amplify get-job --region us-east-1 --app-id d2wwjdgjliumng --branch-name main --job-id <JobId> --query "job.summary.status" --output text

Post-deploy validation
- Lambda exists and has a Function URL:
  - aws lambda list-functions --region us-east-1 --query "Functions[?contains(FunctionName, 'studentSearch')].[FunctionName,Runtime,LastModified]" --output table
  - $FN=$(aws lambda list-functions --region us-east-1 --query "Functions[?contains(FunctionName, 'studentSearch')].FunctionName" --output text)
  - aws lambda get-function-url-config --region us-east-1 --function-name "$FN"
- Frontend build has injected the URL into dist (buildspec handles this during preBuild).

Notes
- We already attached an inline policy to AmplifyServiceRole-SchoolLink to allow reading /cdk-bootstrap/* SSM parameters. That resolved an earlier AccessDenied. Bootstrapping is the remaining blocker.
- If you prefer, run the bootstrap command yourself, or authorize me to run it and I will execute and re-run the build.
