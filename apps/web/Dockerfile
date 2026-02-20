FROM node:20-alpine
WORKDIR /app
COPY package.json tsconfig.base.json ./
COPY apps/web/package.json apps/web/package.json
COPY packages/types/package.json packages/types/package.json
RUN npm install
COPY . .
RUN npm run build --workspace @cloudpulse/web
CMD ["npm", "run", "start", "--workspace", "@cloudpulse/web"]
