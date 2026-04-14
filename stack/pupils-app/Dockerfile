# Multi-stage: Node-Build → nginx-Serve
# Build-Kontext muss das Repo-Root sein (docker-compose.yml setzt context: ..)

FROM node:20-alpine AS build
WORKDIR /src

# Nur package.json zuerst (besseres Layer-Caching)
COPY app/package*.json ./
RUN npm ci

# App-Quellcode
COPY app/ ./
RUN npm run build
# → /src/build/ enthält die fertige SPA

FROM nginx:1.27-alpine
COPY --from=build /src/build /usr/share/nginx/html
COPY stack/pupils-app/nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
