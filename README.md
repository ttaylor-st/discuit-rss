# discuit-rss

an rss feed generator for discuit written in typescript.

type definitions were taken from the Discuit API documentation, which can be
found [here](https://docs.discuit.net/).

## usage

there's a hosted version of this project at `https://ttaylor.run.place:6135`,
which you can use if you don't want to host it yourself. note that it may be
a bit slow.

you can get the rss feed for a community by going to `/{communityName}`
(e.g., `https://ttaylor.run.place:6135/cats`) to get the rss feed for that
community, the last ten posts will be returned, i'll eventually allow
specifying how many posts you want to fetch.

you can also go to `/` to fetch the homepage, which will also return the last
ten posts from all communities.

you can append `?sort=x` to the url to sort posts. the possible values for `x`
are `hot`, `activity`, `new`, `day`, `week`, `month`, `year`. the default is
`hot`.

## installation

### binary

the binaries support linux (x64, arm64), macos (x64, arm64), and windows (x64).

you can find them by going to the [actions] tab, clicking on the latest run,
scrolling down to the `artifacts` section, and downloading the `binaries` zip.

to make it a bit easier, in future i'll at some point use github releases
instead, i haven't really looked into how they work but i will at some point.

after downloading, you can extract the zip and run the binary for your system.

if you wish to build from source instead (you should), you can follow the
instructions below.

### from source

before this, you will need to install [bun](https://bun.sh/), which is a
cool javascript runtime, and [git](https://www.git-scm.com/).

```bash
git clone https://github.com/ttaylor-st/discuit-rss.git
# you can also click the green "Code" button, and then "Download ZIP".
cd ./discuit-rss
bun install
```

## running

```bash
bun run start
```

this will start a server on port 3000 by default, you can change this by
setting the `PORT` environment variable, which, at least on linux and other
unix-like systems, can be done like this:

```bash
PORT=8080 bun run start
# or
export PORT=8080
bun run start
```

you can then access the server at `http://localhost:3000`, or whatever port you
set it to.



## license

this project is licensed under MIT, view [LICENSE](./LICENSE) for more
information.


[actions]: https://github.com/ttaylor-st/discuit-rss/actions
