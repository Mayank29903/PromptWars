FROM node:20-alpine
WORKDIR /app
RUN apk add --no-cache curl
COPY package.json .
RUN npm install --omit=dev
COPY src ./src
EXPOSE 3002
HEALTHCHECK --interval=10s --timeout=5s --retries=5 \
  CMD curl -sf http://localhost:3002/health || exit 1
CMD ["node", "src/index.js"]
