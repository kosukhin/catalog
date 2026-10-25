FROM node:20-alpine

WORKDIR /app

COPY package.json ./
RUN npm install

COPY src ./src
COPY test ./test

EXPOSE 3000

CMD ["npm", "start"]
