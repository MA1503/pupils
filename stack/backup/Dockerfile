FROM node:20-alpine

RUN apk add --no-cache curl tini

# supercronic — cron für non-root Container (https://github.com/aptible/supercronic)
ARG SUPERCRONIC_VERSION=v0.2.29
ARG SUPERCRONIC_SHA1SUM=cd48d45c4b10f3f0bfdd3a57d054cd05ac96812b
RUN curl -fsSLo /usr/local/bin/supercronic \
      "https://github.com/aptible/supercronic/releases/download/${SUPERCRONIC_VERSION}/supercronic-linux-amd64" && \
    echo "${SUPERCRONIC_SHA1SUM}  /usr/local/bin/supercronic" | sha1sum -c - && \
    chmod +x /usr/local/bin/supercronic

RUN npm install -g @filen/cli

# node:20-alpine already ships a 'node' user at uid 1000 — reuse it
COPY --chown=node:node backup.sh /home/node/backup.sh
COPY --chown=node:node crontab /home/node/crontab
RUN chmod +x /home/node/backup.sh

USER node
WORKDIR /home/node

ENTRYPOINT ["/sbin/tini", "--"]
CMD ["supercronic", "/home/node/crontab"]
