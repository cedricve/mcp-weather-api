FROM node:14

WORKDIR /workspace

COPY package*.json ./

RUN npm install

COPY . .

CMD ["npm", "start"]