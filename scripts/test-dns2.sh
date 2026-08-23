#!/bin/bash
echo "=== api.asaas.com"
nslookup api.asaas.com 8.8.8.8
echo ""
echo "=== api-hml.asaas.com (via HTTPS GET)"
docker exec kairos-igreja-app sh -c "wget -qO- https://api-hml.asaas.com 2>&1 | head -3"
echo ""
echo "=== nslookup google.com (sanity check)"
nslookup google.com 8.8.8.8
