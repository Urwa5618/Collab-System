FROM node:20-alpine
RUN npm install -g npm@11.17.0

WORKDIR /app

COPY package.json ./
RUN npm install
RUN npm install -g ts-node-dev

COPY . .

EXPOSE 8080

CMD ["ts-node-dev", "--respawn", "--transpile-only", "src/index.ts"]
