# Use the official Node.js image as a base
FROM node:18-alpine

# Set the working directory inside the container
WORKDIR /usr/src/app

# Copy package.json and pnpm-lock.yaml files to the working directory
COPY package.json ./

# Install pnpm
RUN npm install -g pnpm

# Copy the server directory to the working directory
COPY . .

# Set the working directory to server
WORKDIR /usr/src/app/

# Install the server dependencies
RUN pnpm install

# Expose the port the app runs on
EXPOSE 4000

# Start the server
CMD ["pnpm", "start"]