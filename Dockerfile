FROM node:22-alpine
WORKDIR /app
ENV NODE_ENV=production PORT=8080 GAMES_PORT=8080 DATA_DIR=/data
COPY package*.json ./
RUN npm ci --omit=dev
COPY . .
VOLUME /data
EXPOSE 8080
CMD ["npm", "start"]
