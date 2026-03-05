FROM node:20-alpine

WORKDIR /app

COPY package*.json ./

RUN npm ci --only=production

COPY . .

RUN mkdir -p uploads/avatars temp

EXPOSE 8000

CMD ["node", "server.js"]
