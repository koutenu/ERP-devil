FROM node:22-alpine
WORKDIR /app
COPY server.js .
COPY package.json .
COPY data/ ./data/
RUN echo '{"name":"erp-backend","version":"1.0.0","scripts":{"start":"node server.js"}}' > package.json
EXPOSE 8080
CMD ["node", "server.js"]
