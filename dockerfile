FROM node:20

WORKDIR /app

# copy เฉพาะ package ก่อน (เพื่อ cache)
COPY package*.json ./

RUN npm install

# copy source (ใช้ตอน build ครั้งแรก)
COPY . .

EXPOSE 3000

CMD ["npm", "run", "dev"]
