#!/bin/bash

# Format code with Prettier
npx prettier --write .

# Fix ESLint issues
npx eslint --fix "src/**/*.{ts,js}"
