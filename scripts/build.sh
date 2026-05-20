#!/usr/bin/env bash
set -e

echo "Building exchange hub..."
cd apps/exchange && npm install && npm run build && cd ../..

echo "Building beer portal..."
cd apps/beer && npm install && npm run build && cd ../..

echo "Building egg portal..."
cd apps/egg && npm install && npm run build && cd ../..

echo "Building katie spa portal..."
cd apps/katie && npm install && npm run build && cd ../..

echo "Merging dist..."
mkdir -p dist
cp -r apps/exchange/dist/. dist/
mkdir -p dist/beer  && cp -r apps/beer/dist/.  dist/beer/
mkdir -p dist/egg   && cp -r apps/egg/dist/.   dist/egg/
mkdir -p dist/katie && cp -r apps/katie/dist/. dist/katie/

echo "Done."
