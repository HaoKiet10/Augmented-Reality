# Build context PHẢI là thư mục gốc repo (vì đây là pnpm workspace),
# không phải thư mục backend/. Trên Render/Railway nhớ set:
#   Dockerfile path: backend/Dockerfile
#   Docker build context: . (repo root)

FROM node:20-slim AS base
RUN corepack enable && corepack prepare pnpm@10.33.4 --activate

# Tool của Google dựng database nhận diện ảnh ARCore (.imgdb) — dùng bởi TriggerDbService.
# Ghim theo commit cuối cùng sửa binary này (2018) để build lặp lại được.
ADD https://raw.githubusercontent.com/google-ar/arcore-android-sdk/05af7029a052b8546949910fbfede0ba460dfafd/tools/arcoreimg/linux/arcoreimg /usr/local/bin/arcoreimg
RUN chmod 755 /usr/local/bin/arcoreimg

WORKDIR /app

# Copy trước phần khai báo workspace + package.json để tận dụng Docker layer cache
COPY pnpm-workspace.yaml pnpm-lock.yaml package.json ./
COPY backend/package.json ./backend/package.json
COPY frontend/package.json ./frontend/package.json

RUN pnpm install --frozen-lockfile --filter backend...

# Copy toàn bộ source backend rồi build
COPY backend ./backend
WORKDIR /app/backend

RUN pnpm exec prisma generate
RUN pnpm run build

ENV NODE_ENV=production
EXPOSE 3000
CMD ["node", "dist/main.js"]
