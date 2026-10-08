#!/bin/sh

set -eu

DLQ_NAME="wager-transactions-dlq.fifo"
TRANSACTIONS_NAME="wager-transactions.fifo"
EVENTS_NAME="wager-events.fifo"

get_queue_url() {
  aws sqs get-queue-url \
    --queue-name "$1" \
    --endpoint-url "$AWS_ENDPOINT_URL" \
    --region "$AWS_DEFAULT_REGION" \
    --query 'QueueUrl' \
    --output text 2>/dev/null || true
}

create_dlq() {
  if [ -z "$(get_queue_url "$DLQ_NAME")" ]; then
    aws sqs create-queue \
      --queue-name "$DLQ_NAME" \
      --attributes 'FifoQueue=true,VisibilityTimeout=60' \
      --endpoint-url "$AWS_ENDPOINT_URL" \
      --region "$AWS_DEFAULT_REGION"
  fi
}

create_transactions_queue() {
  if [ -z "$(get_queue_url "$TRANSACTIONS_NAME")" ]; then
    aws sqs create-queue \
      --queue-name "$TRANSACTIONS_NAME" \
      --attributes file:///docker-entrypoint-initaws.d/ready.d/transactions-attributes.json \
      --endpoint-url "$AWS_ENDPOINT_URL" \
      --region "$AWS_DEFAULT_REGION"
  fi
}

create_events_queue() {
  if [ -z "$(get_queue_url "$EVENTS_NAME")" ]; then
    aws sqs create-queue \
      --queue-name "$EVENTS_NAME" \
      --attributes 'FifoQueue=true' \
      --endpoint-url "$AWS_ENDPOINT_URL" \
      --region "$AWS_DEFAULT_REGION"
  fi
}

create_dlq
create_transactions_queue
create_events_queue