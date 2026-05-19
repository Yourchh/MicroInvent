# Etapa 1: Construcción (Build)
FROM node:20-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
# Construimos la aplicación para producción (esto genera la carpeta /dist)
RUN npm run build

# Etapa 2: Servidor Web (Producción)
FROM nginx:alpine
# Copiamos los archivos estáticos generados en la etapa anterior a Nginx
COPY --from=build /app/dist /usr/share/nginx/html
# Exponemos el puerto 80
EXPOSE 80

# Arrancamos Nginx
CMD ["nginx", "-g", "daemon off;"]