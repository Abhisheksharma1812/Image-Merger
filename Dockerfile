FROM node:20-alpine
RUN apk add --no-cache openssl

EXPOSE 3000

WORKDIR /app

ENV NODE_ENV=production

COPY package.json package-lock.json* ./

RUN npm ci --omit=dev && npm cache clean --force

COPY . .

# Ensure Prisma client is generated at build time so @prisma/client is ready at runtime
RUN npx prisma generate

RUN npm run build

CMD ["sh", "-lc", "if [ \"$RUN_MIGRATE\" = \"1\" ]; then npm run setup; fi; npm run start"]
