#!/usr/bin/env bash

set -e

REGISTRY=${1:-}
TOKEN=${2:-}

npm config set registry=$REGISTRY

if [[ "$TOKEN" != "" ]]; then
    npm config set $TOKEN
fi

npm install -g \
    pnpm \
    turbo \
    eslint \
    typescript

npm config set registry=https://registry.npmjs.org/
npm config set //registry.npmjs.org/:_authToken=""