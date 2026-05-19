# Usamos una imagen ligera de Node.js (Alpine es ideal para seguridad)
FROM node:20-alpine

RUN npm install -g npm@latest

# Establecemos el directorio de trabajo dentro del contenedor
WORKDIR /app

# Copiamos los archivos de dependencias
COPY package*.json ./

# Instalamos las dependencias
RUN npm install

# Copiamos el resto del código del servidor
COPY . .

# Exponemos el puerto que usa tu API
EXPOSE 3000

# Comando para iniciar la aplicación
CMD ["npm", "start"]