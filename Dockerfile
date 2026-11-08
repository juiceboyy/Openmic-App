FROM node:22-alpine

WORKDIR /app

# Installeer dependencies
COPY package*.json ./
RUN npm install --omit=dev

# Kopieer broncode
COPY . .

ENV PORT=3000
EXPOSE 3000

CMD ["node", "server.js"]
