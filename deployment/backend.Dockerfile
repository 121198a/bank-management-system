FROM node:20-alpine
WORKDIR /app
ENV NODE_ENV=production
COPY backend/package*.json ./
RUN npm ci --omit=dev --ignore-scripts
COPY backend/src ./src
USER node
EXPOSE 5000
CMD ["node", "src/server.js"]
