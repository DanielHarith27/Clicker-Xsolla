.PHONY: help build run clean test deps

help:
	@echo "Available commands:"
	@echo "  make build     - Build the backend"
	@echo "  make run       - Run the backend"
	@echo "  make dev       - Run in development mode"
	@echo "  make clean     - Remove build artifacts"
	@echo "  make test      - Run tests"
	@echo "  make deps      - Download dependencies"

deps:
	go mod download
	go mod tidy

build:
	go build -o bin/server ./cmd/server

run: build
	./bin/server

dev:
	go run ./cmd/server/main.go

clean:
	rm -rf bin/
	go clean

test:
	go test -v ./...

lint:
	golangci-lint run
