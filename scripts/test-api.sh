#!/bin/bash

# API 테스트 스크립트

set -e

echo "🧪 API 테스트 시작..."
echo ""

# 1. Health check
echo "1️⃣ Health Check"
response=$(curl -s http://localhost:3000/health)
echo "Response: $response"
echo ""

# 2. 서브도메인 없이 Public Restaurant API 호출
echo "2️⃣ Public Restaurant API (서브도메인 없음)"
response=$(curl -s -H "Host: localhost:3000" http://localhost:3000/api/public/restaurant/test-id)
echo "Response: $response"
echo ""

# 3. 서브도메인으로 Public Restaurant API 호출
echo "3️⃣ Public Restaurant API (서브도메인: shop_1)"
response=$(curl -s -H "Host: shop_1.localhost:3000" http://localhost:3000/api/public/restaurant)
echo "Response: $response"
echo ""

# 4. 예약된 서브도메인 테스트
echo "4️⃣ Public Restaurant API (예약된 서브도메인: admin)"
response=$(curl -s -H "Host: admin.localhost:3000" http://localhost:3000/api/public/restaurant)
echo "Response: $response"
echo ""

echo "✅ 테스트 완료"
