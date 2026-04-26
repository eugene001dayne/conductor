FROM node:20-slim

# Install pnpm
RUN npm install -g pnpm@10.33.2

# Set working directory
WORKDIR /app

# Copy package files first (layer caching)
COPY package.json pnpm-lock.yaml .npmrc ./

# Install dependencies
RUN pnpm install --frozen-lockfile

# Copy source code
COPY . .

# Build TypeScript
RUN pnpm build

# Run the worker
CMD ["node", "dist/index.js"]