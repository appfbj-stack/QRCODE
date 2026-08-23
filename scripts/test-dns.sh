#!/bin/bash
# Testa DNS para múltiplos hosts do Asaas
for host in api.asaas.com sandbox.asaas.com.br api.asaas.com.br sandbox.asaas.com www.asaas.com api-hml.asaas.com; do
  echo "=== $host"
  nslookup "$host" 8.8.8.8 2>&1 | head -5
done
