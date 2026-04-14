FROM node:20-alpine

RUN apk add --no-cache curl dcron tini

RUN npm install -g @filen/cli

RUN addgroup -S app && adduser -S app -G app -u 1000

COPY backup.sh /backup.sh
COPY crontab /etc/crontabs/root
RUN chmod +x /backup.sh && chown -R app:app /backups

ENTRYPOINT ["/sbin/tini", "--"]
CMD ["crond", "-f", "-l", "2"]
