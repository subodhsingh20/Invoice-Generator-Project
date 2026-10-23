FROM node:22.22.2-alpine

ENV NODE_ENV=production
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm install --global npm@12.2.1 \
    && npm ci --omit=dev \
    && npm cache clean --force

COPY backend ./backend

USER node
EXPOSE 5000
CMD ["node", "backend/index.js"]
