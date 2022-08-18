FROM alpine:latest

# File Author / Maintainer
LABEL authors="JiJi <i@mmdjiji.com>"

# Use tuna source
# RUN sed -i 's/dl-cdn.alpinelinux.org/mirrors.tuna.tsinghua.edu.cn/g' /etc/apk/repositories

# Update & install required packages
RUN apk update && apk add --update nodejs npm

# Install app dependencies
COPY package.json /www/package.json
RUN cd /www && npm install
# --registry=https://registry.npmmirror.com

# Copy app source
COPY . /www

# Set work directory to /www
WORKDIR /www

# set your port
ENV PORT 8080

# expose the port to outside world
EXPOSE  8080

# start command as per package.json
CMD ["npm", "start"]
