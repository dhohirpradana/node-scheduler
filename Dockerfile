FROM node:14-alpine

WORKDIR /app

COPY package.json package-lock.json ./

RUN npm install --production

COPY index.js ./

CMD ["npm", "start"]
