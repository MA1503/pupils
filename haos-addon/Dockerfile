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

ARG S6_OVERLAY_VERSION=3.2.0.2

RUN apt-get update && apt-get install -y --no-install-recommends \
      nginx curl xz-utils ca-certificates nodejs npm jq \
    && rm -rf /var/lib/apt/lists/*

# s6-overlay (multi-arch: erkennt Arch automatisch)
RUN ARCH=$(uname -m) && \
    curl -fsSL "https://github.com/just-containers/s6-overlay/releases/download/v${S6_OVERLAY_VERSION}/s6-overlay-noarch.tar.xz" \
      | tar -Jxp -C / && \
    curl -fsSL "https://github.com/just-containers/s6-overlay/releases/download/v${S6_OVERLAY_VERSION}/s6-overlay-${ARCH}.tar.xz" \
      | tar -Jxp -C /

# supercronic (multi-arch: erkennt Arch automatisch)
RUN ARCH=$(uname -m) && \
    case "${ARCH}" in \
      x86_64) SUPERCRONIC_ARCH=amd64 ;; \
      aarch64) SUPERCRONIC_ARCH=arm64 ;; \
      *) echo "Unsupported arch: ${ARCH}" && exit 1 ;; \
    esac && \
    curl -fsSLo /usr/local/bin/supercronic \
      "https://github.com/aptible/supercronic/releases/download/v0.2.29/supercronic-linux-${SUPERCRONIC_ARCH}" \
    && chmod +x /usr/local/bin/supercronic

# filen CLI
RUN npm install -g @filen/cli

# Statische App-Dateien aus Stage 1
COPY --from=app-builder /build/build /var/www/pupils/

# rootfs (Services + Scripts)
COPY haos-addon/rootfs/ /

RUN chmod +x /etc/cont-init.d/10-init.sh \
    && chmod +x /etc/services.d/couchdb/run /etc/services.d/couchdb/finish \
    && chmod +x /etc/services.d/nginx/run /etc/services.d/nginx/finish \
    && chmod +x /etc/services.d/cron/run /etc/services.d/cron/finish \
    && chmod +x /app/backup.sh

EXPOSE 8099

ENTRYPOINT ["/init"]
