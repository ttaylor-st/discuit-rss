import express from "express";
import axios, {
  type AxiosRequestHeaders,
  type AxiosResponseHeaders,
} from "axios";
import { Builder } from "xml2js";
import process from "process";

const app = express();
const port = process.env.PORT || 3000;

import {
  type Post,
  type PostsResponse,
  type UserFeedResponse,
  Sort,
} from "./types";

class DiscuitClient {
  csrfToken = "";
  sessionId = "";
  baseUrl = "";
  axios = axios.create({ baseURL: this.baseUrl });

  constructor(baseUrl: string = "https://discuit.net") {
    this.baseUrl = baseUrl;
    this.axios = axios.create({ baseURL: this.baseUrl });
  }

  async init() {
    const response = await this.axios.get("/api/_initial");
    if (!response.headers["set-cookie"]) {
      throw new Error("Failed to get CSRF token and session ID");
    }

    if (
      !response.headers["set-cookie"][0] ||
      !response.headers["set-cookie"][1]
    ) {
      throw new Error("Failed to get CSRF token and session ID");
    }

    const csrfToken = response.headers["set-cookie"][0]
      .split(";")[0]
      .split("=")[1];
    const sessionId = response.headers["set-cookie"][1]
      .split(";")[0]
      .split("=")[1];
    this.csrfToken = csrfToken;
    this.sessionId = sessionId;

    this.axios.defaults.headers["X-CSRF-Token"] = this.csrfToken;
    this.axios.defaults.headers["Cookie"] = `session=${this.sessionId}`;
  }

  async getPosts(
    sort: Sort = Sort.Hot,
    limit = 10,
    communityName?: string,
  ): Promise<PostsResponse> {
    let url = `/api/posts?sort=${sort}`;
    if (communityName) {
      const community = await this.getCommunity(communityName);
      if (!community) throw new Error("Community not found");
      url += `&communityId=${community.id}`;
    }

    url += `&limit=${limit}`;

    const response = await this.axios.get(url);
    return response.data;
  }

  async getUserFeed(
    username: string,
    limit: number,
  ): Promise<UserFeedResponse> {
    const response = await this.axios.get(
      `/api/users/${username}/feed?limit=${limit}`,
    );
    return response.data;
  }

  async getCommunity(communityName: string) {
    const response = await this.axios.get(
      `/api/communities/${communityName}?byName=true`,
    );
    return response.data;
  }
}

function generateRSS(posts: Post[], communityName: string) {
  const createPost = (post: Post) => {
    let description = post.body || "";
    if (post.link) {
      description += `<br>Submitted link: <a href="${post.link.url}">${post.link.hostname}</a>`;
    }
    if (post.image) {
      description += `<br><img src="${post.image.url}" alt="Image" />`;
    }

    description += `<br><br>`;
    description += `${post.upvotes} upvotes, ${post.downvotes} downvotes, ${post.upvotes - post.downvotes} overall`;
    description += `<br><a href="https://discuit.net/${communityName}/post/${post.publicId}">View Post</a>`;
    description += ` • <a href="https://discuit.net/${communityName}/post/${post.publicId}">View ${post.noComments}`;
    description += post.noComments === 1 ? " comment" : " comments";
    description += `</a>`;
    description += ` • Posted by <a href="https://discuit.net/@${post.author?.username || "Unknown"}">@${post.author?.username || "Unknown"}</a>`;

    return {
      title:
        post.title +
        `${post.link ? " (Link)" : ""}` +
        `${post.image ? " (Image)" : ""}`,
      link: `https://discuit.net/${communityName}/post/${post.publicId}`,
      description: description,
      pubDate: new Date(post.createdAt).toUTCString(),
      author: post.author?.username || "Unknown",
      category: `+${communityName}`,
    };
  };

  const rssObject = {
    rss: {
      $: { version: "2.0" },
      channel: [
        {
          title: communityName,
          link: `https://discuit.net/${communityName}`,
          description: `Posts from ${communityName}`,
          item: posts.map((post) => createPost(post)),
        },
      ],
    },
  };

  const builder = new Builder();
  return builder.buildObject(rssObject);
}

const client = new DiscuitClient("https://discuit.net");

type HandleRssRequestOptions = {
  req: AxiosRequestHeaders;
  res: AxiosResponseHeaders;
  name?: string;
  isUser?: boolean;
};
async function handleRSSRequest({
  req,
  res,
  name,
  isUser,
}: HandleRssRequestOptions) {
  const fetchLimit = req.query.limit ? Math.min(req.query.limit, 50) : 10;
  const sort = req.query.sort || Sort.Hot;

  try {
    let rss;
    let posts: PostsResponse;

    if (isUser) {
      if (!name) throw new Error("Username is required for user RSS feed");
      const items: UserFeedResponse = await client.getUserFeed(
        name,
        fetchLimit,
      );

      const tmpPosts = items.items
        .map((item) => (item.type === "post" ? item.item : null))
        .filter((item) => item !== null);

      posts = {
        posts: tmpPosts as Post[],
        next: items.next,
      };
    } else {
      posts = name
        ? await client.getPosts(sort, fetchLimit, name)
        : await client.getPosts(sort, fetchLimit);
    }

    rss = generateRSS(posts.posts, name || "all");
    res.set("Content-Type", "application/rss+xml");
    res.send(rss);
  } catch (error: any) {
    console.log(error);
    error.response
      ? res.status(error.response.status).send(error.response.data)
      : res.status(500).send("Internal Server Error");
  }
}

app.get(
  "/@:username",
  (req: AxiosRequestHeaders, res: AxiosResponseHeaders) => {
    const { username } = req.params;
    handleRSSRequest({ req, res, name: username, isUser: true });
  },
);

app.get(
  "/:communityName",
  (req: AxiosRequestHeaders, res: AxiosResponseHeaders) => {
    const { communityName } = req.params;
    handleRSSRequest({ req, res, name: communityName });
  },
);

app.get("/", (req: AxiosRequestHeaders, res: AxiosResponseHeaders) => {
  handleRSSRequest({ req, res });
});

app.listen(port, async () => {
  await client.init();
  console.log(`Server running on port ${port}`);
});
