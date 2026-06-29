FROM node:20-alpine

# Install build dependencies if needed
RUN apk add --no-cache openssl

WORKDIR /usr/src/app

# Copy package configuration
COPY package*.json ./

# Install all dependencies (including dev for building and running ts-node)
RUN npm install

# Copy source code and Prisma settings
COPY . .

# Generate Prisma Client
RUN npx prisma generate

EXPOSE 5000

# By default, run development command
CMD ["npm", "run", "dev"]
