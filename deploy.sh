#!/bin/bash
# Trip Planner - Push to GitHub and Deploy
# Just double-click this file or run: bash deploy.sh

cd "$(dirname "$0")"

echo "📦 Installing dependencies..."
npm install --silent

echo "🔗 Setting up git..."
git init 2>/dev/null
git add -A
git commit -m "Trip Planner v1 - full build" 2>/dev/null || true
git branch -M main
git remote remove origin 2>/dev/null
git remote add origin https://github.com/kleinhendler-prog/trip-planner.git

echo "🚀 Pushing to GitHub..."
git push -u origin main --force

echo ""
echo "✅ Done! Now go to https://vercel.com/new and import 'trip-planner' from your GitHub repos."
echo ""
