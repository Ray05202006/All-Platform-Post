#!/bin/bash

# Script to generate secure environment keys for All-Platform-Post

echo "==================================="
echo "Environment Key Generator"
echo "==================================="
echo ""

# Check if openssl is available
if ! command -v openssl &> /dev/null; then
    echo "Error: openssl is not installed."
    echo "Please install openssl and try again."
    exit 1
fi

echo "Generating secure keys..."
echo ""

# Generate ENCRYPTION_KEY
ENCRYPTION_KEY=$(openssl rand -hex 32)
echo "ENCRYPTION_KEY (64-char hex, 32 bytes):"
echo "$ENCRYPTION_KEY"
echo ""

# Generate JWT_SECRET
JWT_SECRET=$(openssl rand -hex 32)
echo "JWT_SECRET (64-char hex, 32 bytes):"
echo "$JWT_SECRET"
echo ""

echo "==================================="
echo "Add these to your .env file or deployment environment variables:"
echo "==================================="
echo ""
echo "ENCRYPTION_KEY=\"$ENCRYPTION_KEY\""
echo "JWT_SECRET=\"$JWT_SECRET\""
echo ""
echo "For Zeabur deployment:"
echo "1. Go to your service settings"
echo "2. Navigate to 'Environment Variables'"
echo "3. Add both ENCRYPTION_KEY and JWT_SECRET with the values above"
echo ""
