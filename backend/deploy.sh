#!/bin/bash

# Deployment script for Rushr backend on api.backpacklab.com

echo "Deploying Rushr backend to api.backpacklab.com..."

# Stop existing PM2 process if running
pm2 stop rushr-backend || true
pm2 delete rushr-backend || true

# Pull latest changes (if using git)
# git pull origin main

# Install dependencies
npm install --production

# Copy environment file for production
cp .env.production .env

# Start with PM2
pm2 start server.js --name rushr-backend

# Save PM2 configuration
pm2 save

# Setup PM2 startup script (run once on first deployment)
# pm2 startup

echo "Deployment complete!"
echo "Backend running on port 3000"
echo "Check status with: pm2 status"
echo "View logs with: pm2 logs rushr-backend"
