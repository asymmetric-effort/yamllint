.PHONY: all setup clean lint test test-coverage build help release release/minor release/major

PROJECT_NAME := yamllint
SRC_DIR := src
TEST_DIR := tests
BUILD_DIR := build
BIN_DIR := bin
VERSION_FILE := VERSION
BIN := node_modules/.bin

VERSION := $(shell cat $(VERSION_FILE))

SHELL := /bin/bash

# Default target
all: build

# ============================================================================
# Setup — install dependencies and git hooks
# ============================================================================
setup:
	@echo "Installing git hooks..."
	@bash git-hooks/setup.sh
	@echo "Installing dependencies..."
	npm install
	@echo "Setup complete."

# ============================================================================
# Clean — remove build artifacts
# ============================================================================
clean:
	@echo "Cleaning..."
	rm -rf $(BUILD_DIR) $(BIN_DIR)
	mkdir -p $(BUILD_DIR) $(BIN_DIR)
	@echo "Clean complete."

# ============================================================================
# Lint — run strict linters on all file types
# ============================================================================
lint:
	@echo "Running typecheck..."
	npx tsc --noEmit
	@echo "Running eslint..."
	npx eslint $(SRC_DIR)
	@if find $(TEST_DIR) -name '*.ts' | grep -q .; then npx eslint $(TEST_DIR); fi
	@echo "Running markdownlint..."
	npx markdownlint '**/*.md' --ignore node_modules --ignore build
	@echo "Running prettier check..."
	npx prettier --check '$(SRC_DIR)/**/*.ts'
	@if find $(TEST_DIR) -name '*.ts' | grep -q .; then npx prettier --check '$(TEST_DIR)/**/*.ts'; fi
	@echo "Lint passed."

# ============================================================================
# Test — run all tests
# ============================================================================
test:
	@echo "Running unit tests..."
	node --import tsx/esm --test $(TEST_DIR)/unit/*.test.ts
	@echo "Running integration tests..."
	node --import tsx/esm --test $(TEST_DIR)/integration/*.test.ts
	@echo "Running e2e tests..."
	node --import tsx/esm --test $(TEST_DIR)/e2e/*.test.ts
	@echo "All tests passed."

# ============================================================================
# Build — compile TypeScript, create binary, pack npm package
# ============================================================================
build: clean
	@echo "Building $(PROJECT_NAME) v$(VERSION)..."
	npx tsc
	@echo "Packing npm package..."
	npm pack --dry-run
	@echo "Build complete."

# ============================================================================
# Release — version management
# ============================================================================
define bump_version
	@CURRENT=$$(cat $(VERSION_FILE)); \
	IFS='.' read -r MAJOR MINOR PATCH <<< "$$CURRENT"; \
	$(1); \
	NEW="$$MAJOR.$$MINOR.$$PATCH"; \
	echo "$$NEW" > $(VERSION_FILE); \
	sed -i "s/\"version\": \".*\"/\"version\": \"$$NEW\"/" package.json; \
	echo "export const VERSION = \"$$NEW\";" > $(SRC_DIR)/version.ts; \
	git add $(VERSION_FILE) package.json $(SRC_DIR)/version.ts; \
	git commit -m "chore: release v$$NEW"; \
	git tag "v$$NEW"; \
	echo "Released v$$NEW"
endef

release:
	$(call bump_version,PATCH=$$((PATCH + 1)))

release/minor:
	$(call bump_version,MINOR=$$((MINOR + 1)); PATCH=0)

release/major:
	$(call bump_version,MAJOR=$$((MAJOR + 1)); MINOR=0; PATCH=0)

# ============================================================================
# Help
# ============================================================================
help:
	@echo "$(PROJECT_NAME) Makefile"
	@echo ""
	@echo "Targets:"
	@echo "  all (default)    Build the project"
	@echo "  setup            Install dependencies and git hooks"
	@echo "  clean            Delete build artifacts"
	@echo "  lint             Run all linters (tsc, eslint, markdownlint, prettier)"
	@echo "  test             Run all tests (unit, integration, e2e)"
	@echo "  test-coverage    Run tests with coverage report"
	@echo "  build            Build library, standalone binary, and verify npm pack"
	@echo "  release          Bump patch version, commit, and tag"
	@echo "  release/minor    Bump minor version, commit, and tag"
	@echo "  release/major    Bump major version, commit, and tag"
	@echo "  help             Show this help"
