OPT := rmj-

build-debug:
	docker buildx build -f Dockerfile -t $(OPT)-fe-debug .

build-v1:
	docker build -f Dockerfile.v1 -t $(OPT)-v1 .

build-v2:
	docker build -f Dockerfile.v2 -t $(OPT)-v2 .

up-v1:
	docker compose -f docker-compose.yaml up fe-v1 -d

up-v2:
	docker compose -f docker-compose.yaml up fe-v2 -d

ps:
	docker compose ps

log:
	docker compose logs