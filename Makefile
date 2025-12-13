.PHONY: all build run test clean docker docker-multi frontend backend

# Variables
BINARY_NAME=ip-lookup
DOCKER_IMAGE=ip-lookup
DOCKER_TAG=latest

all: frontend backend

# Build frontend
frontend:
	cd web && npm ci && npm run build
	rm -rf cmd/ip-lookup/static/*
	cp -r web/dist/* cmd/ip-lookup/static/

# Build backend
backend:
	go build -o $(BINARY_NAME) ./cmd/ip-lookup

# Build everything
build: frontend backend

# Run locally (requires MMDB files in data/)
run: build
	./$(BINARY_NAME)

# Run tests
test:
	go test -v ./...
	cd web && npm test

# Run Go tests only
test-go:
	go test -v ./...

# Run frontend tests only
test-frontend:
	cd web && npm test

# Clean build artifacts
clean:
	rm -f $(BINARY_NAME)
	rm -rf web/dist
	rm -rf cmd/ip-lookup/static/*
	touch cmd/ip-lookup/static/.gitkeep

# Build Docker image (single architecture)
docker:
	docker build -t $(DOCKER_IMAGE):$(DOCKER_TAG) .

# Build Docker image for multiple architectures
docker-multi:
	docker buildx build --platform linux/amd64,linux/arm64 -t $(DOCKER_IMAGE):$(DOCKER_TAG) .

# Build and push multi-arch image
docker-push:
	docker buildx build --platform linux/amd64,linux/arm64 -t $(DOCKER_IMAGE):$(DOCKER_TAG) --push .

# Run Docker container
docker-run:
	docker run -p 8080:8080 $(DOCKER_IMAGE):$(DOCKER_TAG)

# Run Docker container in headless mode
docker-run-headless:
	docker run -p 8080:8080 -e HEADLESS=true $(DOCKER_IMAGE):$(DOCKER_TAG)

# Generate Swagger documentation
swagger:
	swag init -g cmd/ip-lookup/main.go -o docs

# Download MMDB databases for local development
download-db:
	mkdir -p data
	curl -sL $$(curl -s https://api.github.com/repos/Shoyu-Dev/mmdb-latest/releases/latest | grep browser_download_url | grep dbip-city-lite.mmdb | cut -d '"' -f 4) -o data/dbip-city-lite.mmdb
	curl -sL $$(curl -s https://api.github.com/repos/Shoyu-Dev/mmdb-latest/releases/latest | grep browser_download_url | grep dbip-asn-lite.mmdb | cut -d '"' -f 4) -o data/dbip-asn-lite.mmdb

# Development mode - run frontend dev server
dev-frontend:
	cd web && npm run dev

# Development mode - run backend (requires MMDB files)
dev-backend:
	go run ./cmd/ip-lookup

# Help
help:
	@echo "Available targets:"
	@echo "  all           - Build frontend and backend"
	@echo "  build         - Build everything"
	@echo "  frontend      - Build frontend only"
	@echo "  backend       - Build backend only"
	@echo "  run           - Build and run locally"
	@echo "  test          - Run all tests"
	@echo "  test-go       - Run Go tests only"
	@echo "  test-frontend - Run frontend tests only"
	@echo "  clean         - Clean build artifacts"
	@echo "  docker        - Build Docker image"
	@echo "  docker-multi  - Build multi-arch Docker image"
	@echo "  docker-run    - Run Docker container"
	@echo "  docker-run-headless - Run Docker container in headless mode"
	@echo "  swagger       - Generate Swagger documentation"
	@echo "  download-db   - Download MMDB databases for local dev"
	@echo "  dev-frontend  - Run frontend dev server"
	@echo "  dev-backend   - Run backend in dev mode"
