FROM node:20-alpine
WORKDIR /app

RUN npm install -g pnpm turbo

# We skip full workspace build for this stub to avoid docker build context issues
# Just copying the dashboard files to show it runs standalone for dev
COPY package.json ./
RUN npm install
COPY . .

EXPOSE 5173
CMD ["npm", "run", "dev"]
