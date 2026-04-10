FROM node:20-alpine AS builder
WORKDIR /app
RUN npm install -g bun
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile
COPY . .
RUN bun run build

FROM node:20-alpine
WORKDIR /app
RUN npm install -g bun
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public
ENV NODE_ENV=production
ENV PORT=3000
EXPOSE 3000
CMD ["bun", "server.js"]
