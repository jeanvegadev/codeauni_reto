.PHONY: deploy dev install build test typecheck up down logs

deploy:
	./deploy.sh

dev:
	./scripts/dev.sh

install:
	npm ci --prefix apps/api
	npm ci --prefix apps/web

build:
	npm run build

test:
	npm test

typecheck:
	npm run typecheck

up:
	docker compose up --build

down:
	docker compose down

logs:
	docker compose logs -f
