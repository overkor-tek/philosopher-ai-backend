# Philosopher AI Backend - Makefile
# Built by C1 Cloud (CP3) - Autonomous Work
#
# Usage: make [target]

.PHONY: help install dev start test docker-up docker-down docker-logs backup status clean

# Default target
help:
	@echo ""
	@echo "🌀 PHILOSOPHER AI BACKEND"
	@echo "════════════════════════════════════════"
	@echo ""
	@echo "Development:"
	@echo "  make install    - Install dependencies"
	@echo "  make dev        - Start development server"
	@echo "  make start      - Start production server"
	@echo "  make test       - Run tests"
	@echo ""
	@echo "Docker:"
	@echo "  make docker-up  - Start Docker stack"
	@echo "  make docker-down - Stop Docker stack"
	@echo "  make docker-logs - View Docker logs"
	@echo ""
	@echo "Utilities:"
	@echo "  make backup     - Backup database"
	@echo "  make status     - Check system status"
	@echo "  make test-api   - Test API endpoints"
	@echo "  make validate-env - Validate environment"
	@echo "  make startup-check - Full system check"
	@echo "  make preflight  - Pre-deployment checks"
	@echo "  make db-seed    - Seed test data"
	@echo "  make clean      - Clean temp files"
	@echo ""
	@echo "════════════════════════════════════════"
	@echo ""

# Development
install:
	npm ci

dev:
	npm run dev

start:
	npm start

test:
	npm test

# Docker
docker-up:
	docker-compose up -d
	@echo "✅ Stack started. Health: http://localhost:3001/api/health"

docker-down:
	docker-compose down

docker-logs:
	docker-compose logs -f

docker-rebuild:
	docker-compose down
	docker-compose build --no-cache
	docker-compose up -d

# Utilities
backup:
	./scripts/backup-db.sh

status:
	node scripts/check-status.js

test-api:
	./scripts/test-api.sh

# Cleanup
clean:
	rm -rf node_modules/.cache
	rm -rf coverage/
	rm -f *.log
	rm -f error.log combined.log
	@echo "✅ Cleaned temp files"

# PM2
pm2-start:
	pm2 start ecosystem.config.js --env production

pm2-stop:
	pm2 stop philosopher-backend

pm2-logs:
	pm2 logs philosopher-backend

# Database
db-migrate:
	npm run db:migrate

db-reset:
	npm run db:reset

db-seed:
	node scripts/seed-db.js

# Validation
validate-env:
	node scripts/validate-env.js

startup-check:
	node scripts/startup-check.js

# Pre-flight check before production
preflight: validate-env startup-check
	@echo "✅ All pre-flight checks passed"
