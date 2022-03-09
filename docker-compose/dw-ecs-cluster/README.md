# Aline ECS Deployment

ECS deployment of the Aline Financial Application

# Setup

use `make login` to login into the registry using aws cli configuration and env variables

## Deployment

- Change directory to root direcory of this readme
- Copy the text from `.env.example` into a new file called `.env`
- Fill out values
- Switch to ecs context with `docker context use <ecs context>`
- Run `docker compose up`
