# Dynamic versions to enable test matrix
ARG VERSION=15
FROM node:${VERSION}-alpine

# Code folder inside Docker
RUN mkdir /code
WORKDIR /code

COPY ./package*.json ./

RUN npm install
