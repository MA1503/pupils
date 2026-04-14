FROM node:20-alpine

# dcron: leichtgewichtiger Cron-Daemon (kein crond von busybox)
# tini: PID-1-Wrapper für sauberes Signal-Handling
RUN apk add --no-cache curl dcron tini

# filen-cli installieren
# HINWEIS: Paketname vor Deployment verifizieren:
#   docker run --rm node:20-alpine npm info @filen/cli version
# Falls Paket anders heißt, hier anpassen.
RUN npm install -g @filen/cli

COPY backup.sh /backup.sh
COPY crontab /etc/crontabs/root
RUN chmod +x /backup.sh

# tini als PID 1 → crond als foreground-Prozess
ENTRYPOINT ["/sbin/tini", "--"]
CMD ["crond", "-f", "-l", "2"]
