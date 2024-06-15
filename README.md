# discuit-rss

an rss feed for discuit written in typescript.

## usage

note that we do not have a hosted version of this service, so you will need to
run it yourself.

go to `/{communityName}` (e.g., `/cats`) to get the rss feed for that
community, the last ten posts will be returned.

you can also go to `/` to fetch the homepage, which will also return the last
ten posts from all communities.

## installation

before this, you will need to install [bun](https://bun.sh/), which is a
cool javascript runtime.

```bash
git clone https://github.com/ttaylor-st/discuit-rss.git
cd ./discuit-rss
bun install
```

## running

```bash
bun run start`
```

this will start a server on port 3000 by default, you can change this by
setting the `PORT` environment variable. you can access the rss feed at
`http://localhost:3000/{communityName}`.

## license

this project is licensed under MIT, view [LICENSE](./LICENSE) for more
information.
