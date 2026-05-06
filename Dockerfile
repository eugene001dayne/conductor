FROM node:22-slim

RUN npm install -g pnpm@10.33.2

WORKDIR /app

COPY package.json pnpm-lock.yaml .npmrc ./

RUN pnpm install --frozen-lockfile

COPY . .

RUN pnpm build

EXPOSE 8080

ENV CONDUCTOR_DEV_MODE=false

CMD ["node", "dist/index.js"]