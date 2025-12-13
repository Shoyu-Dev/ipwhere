# ============================================
# Stage 1: Download MMDB databases
# ============================================
FROM alpine:3.19 AS downloader

RUN apk add --no-cache curl jq

WORKDIR /data

# Download latest DB-IP databases from mmdb-latest releases
RUN RELEASE_URL=$(curl -s https://api.github.com/repos/Shoyu-Dev/mmdb-latest/releases/latest | jq -r '.assets[] | select(.name | contains("dbip")) | .browser_download_url' | head -1 | sed 's|/[^/]*$||') && \
    echo "Downloading from release..." && \
    curl -sL "${RELEASE_URL}/dbip-city-lite.mmdb" -o dbip-city-lite.mmdb && \
    curl -sL "${RELEASE_URL}/dbip-asn-lite.mmdb" -o dbip-asn-lite.mmdb && \
    ls -la /data/

# ============================================
# Stage 2: Build Frontend (Node.js + Tailwind)
# ============================================
FROM node:20-alpine AS frontend-builder

WORKDIR /app/web

# Install dependencies first (better caching)
COPY web/package.json web/package-lock.json* ./
RUN npm ci || npm install

# Copy source and build
COPY web/ ./
RUN npm run build

# ============================================
# Stage 3: Build Go Binary
# ============================================
FROM golang:1.22-alpine AS go-builder

WORKDIR /app

# Install build dependencies
RUN apk add --no-cache git

# Download Go dependencies first (better caching)
COPY go.mod go.sum ./
RUN go mod download

# Copy source code
COPY . .

# Copy built frontend assets from Stage 2
COPY --from=frontend-builder /app/web/dist ./cmd/ip-lookup/static/

# Copy MMDB databases from Stage 1 for embedding reference
# (We'll actually copy them to runtime, but need them in same location for path resolution)
RUN mkdir -p /app/data

# Build with optimizations for multiple architectures
ARG TARGETOS=linux
ARG TARGETARCH=amd64
ENV CGO_ENABLED=0 GOOS=${TARGETOS} GOARCH=${TARGETARCH}
RUN go build -ldflags="-w -s" -o /app/ip-lookup ./cmd/ip-lookup

# ============================================
# Stage 4: Runtime (Minimal Image)
# ============================================
FROM alpine:3.19 AS runtime

# Add ca-certificates for HTTPS and timezone data
RUN apk --no-cache add ca-certificates tzdata

# Create non-root user
RUN addgroup -S appgroup && adduser -S appuser -G appgroup

WORKDIR /app

# Copy binary from build stage
COPY --from=go-builder /app/ip-lookup .

# Copy MMDB databases from download stage
COPY --from=downloader /data/*.mmdb ./data/

# Set ownership
RUN chown -R appuser:appgroup /app

# Use non-root user
USER appuser

# Expose port
EXPOSE 8080

# Environment variables
ENV LISTEN_ADDR=:8080 \
    CITY_DB_PATH=/app/data/dbip-city-lite.mmdb \
    ASN_DB_PATH=/app/data/dbip-asn-lite.mmdb

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s \
    CMD wget --quiet --tries=1 --spider http://localhost:8080/health || exit 1

# Run
ENTRYPOINT ["./ip-lookup"]
CMD ["-l", ":8080"]
