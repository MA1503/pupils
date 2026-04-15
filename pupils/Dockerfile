# Build-Context: Repo-Root (damit app/ erreichbar ist)

# Stage 1: SvelteKit bauen
FROM node:20-alpine AS app-builder
WORKDIR /build
COPY app/package*.json ./
RUN npm ci
COPY app/ .
RUN npm run build

# Stage 2: Runtime
FROM couchdb:3.3.3

RUN apt-get update && apt-get install -y --no-install-recommends \
      nginx curl ca-certificates nodejs npm jq \
    && rm -rf /var/lib/apt/lists/*

# supercronic (multi-arch: erkennt Arch automatisch, SHA1-Verifikation)
RUN ARCH=$(uname -m) && \
    case "${ARCH}" in \
      x86_64)  SUPERCRONIC_ARCH=amd64; SHA=cd48d45c4b10f3f0bfdd3a57d054cd05ac96812b ;; \
      aarch64) SUPERCRONIC_ARCH=arm64; SHA=512f6736450c56555e01b363144c3c9d23abed4c ;; \
      *) echo "Unsupported arch: ${ARCH}" && exit 1 ;; \
    esac && \
    curl -fsSLo /usr/local/bin/supercronic \
      "https://github.com/aptible/supercronic/releases/download/v0.2.29/supercronic-linux-${SUPERCRONIC_ARCH}" && \
    echo "${SHA}  /usr/local/bin/supercronic" | sha1sum -c - && \
    chmod +x /usr/local/bin/supercronic

# filen CLI
RUN npm install -g @filen/cli

# Statische App-Dateien aus Stage 1
COPY --from=app-builder /build/build /var/www/pupils/

# rootfs (nginx config + scripts)
COPY pupils/rootfs/ /

RUN chmod +x /run.sh /app/backup.sh

ARG BUILD_VERSION

LABEL \
  io.hass.version="${BUILD_VERSION}" \
  io.hass.type="addon" \
  io.hass.arch="aarch64,amd64"

EXPOSE 8099

ENTRYPOINT ["/run.sh"]
