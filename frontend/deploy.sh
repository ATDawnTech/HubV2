#!/bin/bash

# Configuration
BUCKET_DEV="adthub-dev"
BUCKET_STG="at-dawn-application-staging"
BUCKET_PROD="at-dawn-application-production"
DIST_DIR="dist"
REGION="us-east-1"

# CloudFront Distribution IDs (Required for invalidation)
# Please update these with your actual CloudFront Distribution IDs
CF_DIST_DEV="E3FX2Z4KLE73C3"
CF_DIST_STG="E2QDT5S0MMBDSU"
CF_DIST_PROD="E2I7L4U8RFT61L"

# Load environment variables from .env if it exists
if [ -f .env ]; then
  export $(grep -v '^#' .env | xargs)
fi

# Check for AWS credentials
if [[ -z "$AWS_ACCESS_KEY_ID" ]] || [[ -z "$AWS_SECRET_ACCESS_KEY" ]]; then
  echo "❌ AWS credentials not found."
  echo "Please set AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY in your environment or a .env file."
  exit 1
fi

# Check for environment argument
ENV=$1

if [[ -z "$ENV" ]]; then
  echo "Usage: ./deploy.sh [dev|stg|prod]"
  exit 1
fi

# Set configuration based on environment
case $ENV in
  dev)
    BUCKET=$BUCKET_DEV
    CF_DIST=$CF_DIST_DEV
    BUILD_CMD="npm run build:dev"
    ;;
  stg)
    BUCKET=$BUCKET_STG
    CF_DIST=$CF_DIST_STG
    BUILD_CMD="npm run build:stg"
    ;;
  prod)
    BUCKET=$BUCKET_PROD
    CF_DIST=$CF_DIST_PROD
    BUILD_CMD="npm run build:prod"
    ;;
  *)
    echo "Invalid environment: $ENV. Use dev, stg, or prod."
    exit 1
    ;;
esac

echo "🚀 Starting deployment to $ENV ($BUCKET)..."

# Build the application
echo "📦 Running build: $BUILD_CMD"
$BUILD_CMD

if [ $? -ne 0 ]; then
  echo "❌ Build failed. Deployment aborted."
  exit 1
fi

# Sync to S3
echo "☁️  Syncing $DIST_DIR to s3://$BUCKET..."
aws s3 sync $DIST_DIR s3://$BUCKET --delete --region $REGION

if [ $? -ne 0 ]; then
  echo "❌ Sync failed."
  exit 1
fi

# CloudFront Invalidation
if [[ -n "$CF_DIST" && "$CF_DIST" != "E2XXXXXXXXXXXX" ]]; then
  echo "🧹 Creating CloudFront invalidation for $CF_DIST..."
  aws cloudfront create-invalidation --distribution-id $CF_DIST --paths "/*" --region $REGION
  if [ $? -eq 0 ]; then
    echo "✨ Invalidation request submitted successfully!"
  else
    echo "⚠️  CloudFront invalidation failed."
  fi
else
  echo "ℹ️  Skipping CloudFront invalidation (Distribution ID not configured)."
fi

echo "✅ Deployment process completed!"
