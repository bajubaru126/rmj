# base command
# # install di root folder
# npm install
# npx update-browserslist-db@latest
# # masuk ke folder packages demo
# cd packages/demo
# # lalu build
# npm run build

# === BASE IMAGE UNTUK BUILD & DEV ===
FROM node:23 AS build
WORKDIR /app
COPY . .

# Install dependencies
RUN npm install
# RUN npx update-browserslist-db@latest

RUN cd /app
RUN npm run build

# === STAGE PRODUCTION (NGINX) ===
FROM nginx:1.27.4-alpine-slim AS prod

# Bersihkan konfigurasi default
RUN rm /etc/nginx/conf.d/default.conf

# Copy konfigurasi custom (jika ada)
COPY nginx.conf /etc/nginx/nginx.conf
COPY default.conf /etc/nginx/conf.d/default.conf

# Copy hasil build dari stage build
COPY --from=build /app/build /usr/share/nginx/html

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
