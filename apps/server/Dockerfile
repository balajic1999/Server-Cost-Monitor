FROM node:20-alpine
WORKDIR /app
COPY package.json tsconfig.base.json ./
COPY apps/server/package.json apps/server/package.json
COPY packages/db/package.json packages/db/package.json
COPY packages/types/package.json packages/types/package.json
RUN npm install
COPY . .
RUN npm run build --workspace @cloudpulse/server
CMD ["npm", "run", "start", "--workspace", "@cloudpulse/server"]
