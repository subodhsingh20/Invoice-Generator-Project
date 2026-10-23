FROM node:22.22.2-alpine

ENV NODE_ENV=production
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm install --prefix /opt/npm-cli --no-save npm@12.2.1
RUN node /opt/npm-cli/node_modules/npm/bin/npm-cli.js ci --omit=dev \
    && node /opt/npm-cli/node_modules/npm/bin/npm-cli.js cache clean --force \
    && rm -rf /usr/local/lib/node_modules/npm /opt/npm-cli

COPY backend ./backend

USER node
EXPOSE 5000
CMD ["node", "backend/index.js"]
