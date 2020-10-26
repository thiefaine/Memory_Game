# Memory Game

Memory Game is a simple web memory game made with Html / Css / Js / NodeJs / Express / Socket.io / Sqlite.
It's a kind of tutorial on how to use those techs.

You have 3 munutes to match all the tiles by pair.
The scores are saved and the best ones are shown at the start of the game.

## Installation

You can use Docker and the Dockerfile given to create a perfect image and launch the app :

```bash
cd folder_with_docker_file
docker build -t username/memory-game .
```

Or use a pre built image directly from docker hub : https://hub.docker.com/repository/docker/thiefaine/memory_game_oclock/general

```bash
docker pull thiefaine/memory_game_oclock:latest
```

then run it :

```bash
docker run --name memory-game-instance -p 80:3000 -d username/memory-game
```


## Play

Once launched simply go to http://localhost & play