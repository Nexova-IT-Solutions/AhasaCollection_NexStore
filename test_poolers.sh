#!/bin/bash
REGIONS=("ap-southeast-1" "ap-south-1")
for region in "${REGIONS[@]}"; do
  for aws in "aws-0" "aws-1"; do
    domain="$aws-$region.pooler.supabase.com"
    echo "Testing $domain..."
    timeout 5 psql "postgres://postgres.kvglredjnqdqqbmmhivi:59RjhGVfPhxV8O8s@$domain:6543/postgres" -c "SELECT 1;"
  done
done
