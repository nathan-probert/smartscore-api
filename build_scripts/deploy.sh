#!/bin/bash

# one of {dev, prod}
ENV=${ENV:-dev}  # If ENV is not set, default to "dev"

MAX_ZIP_SIZE_MB=25

SOURCE_DIR="smartscore_api"
OUTPUT_DIR="output"

STACK_NAME="SmartScore-api-$ENV"
TEMPLATE_FILE="./template.yaml"

KEY="$STACK_NAME.zip"


generate_smartscore_api_stack() {
  VERSION_ID=$1  # Get the version ID as a parameter

  if aws cloudformation describe-stacks --stack-name "$STACK_NAME" &>/dev/null; then
    echo "Updating CloudFormation stack $STACK_NAME..."
    aws cloudformation update-stack \
      --stack-name "$STACK_NAME" \
      --template-body file://"$TEMPLATE_FILE" \
      --parameters ParameterKey=ENV,ParameterValue="$ENV" \
                   ParameterKey=CodeVersionId,ParameterValue="$VERSION_ID" \
                   ParameterKey=S3Key,ParameterValue="$Key" \
      --capabilities CAPABILITY_NAMED_IAM

    echo "Waiting for CloudFormation stack update to complete..."
    aws cloudformation wait stack-update-complete --stack-name "$STACK_NAME"
  else
    echo "Creating CloudFormation stack $STACK_NAME..."
    aws cloudformation create-stack \
      --stack-name "$STACK_NAME" \
      --template-body file://"$TEMPLATE_FILE" \
      --parameters ParameterKey=ENV,ParameterValue="$ENV" \
                   ParameterKey=CodeVersionId,ParameterValue="$VERSION_ID" \
      --capabilities CAPABILITY_NAMED_IAM

    echo "Waiting for CloudFormation stack creation to complete..."
    aws cloudformation wait stack-create-complete --stack-name "$STACK_NAME"
  fi

  # Check the final status of the stack
  STACK_STATUS=$(aws cloudformation describe-stacks --stack-name "$STACK_NAME" --query "Stacks[0].StackStatus" --output text)

  if [[ "$STACK_STATUS" != "CREATE_COMPLETE" && "$STACK_STATUS" != "UPDATE_COMPLETE" ]]; then
    echo "CloudFormation stack operation failed with status: $STACK_STATUS."
    exit 1  # Exit with error
  fi

  echo "CloudFormation stack $STACK_NAME completed successfully with status: $STACK_STATUS."
}


generate_zip_file() {
  echo "Creating ZIP package for Lambda..."
  cd $OUTPUT_DIR

  # Exclude any .zip files from the ZIP package
  zip -r $KEY . -x "*.zip" > /dev/null

  cd ..

  ZIP_FILE_SIZE=$(stat -c%s "$OUTPUT_DIR/$KEY")
  ZIP_FILE_SIZE_MB=$((ZIP_FILE_SIZE / 1024 / 1024))

  echo "Size of ZIP file: $ZIP_FILE_SIZE_MB MB"

  if [ $ZIP_FILE_SIZE_MB -gt $MAX_ZIP_SIZE_MB ]; then
      echo "Error: The ZIP file exceeds $MAX_ZIP_SIZE_MB MB. Aborting deployment."
      exit 1
  fi
}


# main

# create the output directory
mkdir -p $OUTPUT_DIR

# update dependencies
poetry export -f requirements.txt --output $OUTPUT_DIR/requirements.txt --without-hashes
poetry run pip install --no-deps -r $OUTPUT_DIR/requirements.txt -t $OUTPUT_DIR
rm -f $OUTPUT_DIR/requirements.txt

# update the code
cp -r $SOURCE_DIR/* $OUTPUT_DIR/

# generate the ZIP file
generate_zip_file

# create the CloudFormation stack for the S3 bucket
S3_BUCKET_NAME=$(generate_bucket_stack 2>/dev/null)
if [ $? -ne 0 ]; then
  echo "Failed to create or retrieve S3 bucket name." >&2
  exit 1
else
  echo "S3 bucket created: $S3_BUCKET_NAME"
fi

# upload the code to bucket stack
aws s3 cp $OUTPUT_DIR/$KEY s3://$S3_BUCKET_NAME/$KEY
VERSION_ID=$(aws s3api list-object-versions --bucket $S3_BUCKET_NAME --prefix $KEY --query "Versions[?IsLatest].VersionId" --output text)

# Output the version ID
echo "Uploaded version ID: $VERSION_ID"

# create the CloudFormation stack for smartscore_api
generate_smartscore_api_stack "$VERSION_ID"  # Pass the version ID to the function
