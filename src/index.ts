import express from "express";
import axios from "axios";
import { Builder } from "xml2js";
import process from "process";

const app = express();
const port = process.env.PORT || 3000;

type Image = {
  id: string; // The ID of the image.

  format: "jpeg" | "webp" | "png"; // The image format.
  mimetype: string; // The image MIME Type, eg. "image/jpeg".

  width: number; // The image width.
  height: number; // The image height.
  size: number; // The size of the image in bytes.

  averageColor: "rgb([r: number], [g: number], [b: number])"; // The average color of the image.

  url: string; // A link to the image. The path is not prefixed with /api.
  copies: ImageCopy[]; // A list of copies of the image in different sizes.
};

type ImageCopy = {
  name: string | undefined; // The name of the image copy, used to identify it.

  width: number; // The width of the image copy.
  height: number; // The height of the image copy.
  boxWidth: number; // The width of the box that the image fits numbero.
  boxHeight: number; // The height of the box that the image fits numbero.
  objectFit: "cover" | "contain"; // How the image should fit numbero a box. Corresponds to the CSS `object-fit` property.

  format: "jpeg" | "webp" | "png"; // The format of the image copy.
  url: string; // A link to the image copy. The path is not prefixed with /api.
};

type Post = {
  id: string; // The ID of the post
  type: "text" | "image" | "link"; // The type of post
  // The value in https://discuit.net/gaming/post/{publicId}
  publicId: string;

  userId: string; // ID of the author.
  username: string; // Username of the author.
  userGhostId: string | undefined; // The ID of the Ghost user in case the user deleted their account
  // In what capacity the post was created. For "speaking officially" as a mod or an admin.
  userGroup: "normal" | "admins" | "mods";
  userDeleted: boolean; // Indicated whether the author's account is deleted

  isPinned: boolean; // If the post is pinned in the community
  isPinnedSite: boolean; // If the post is pinned site-wide

  communityId: string; // The ID of the community the post is posted in
  communityName: string; // The name of that community
  communityProPic: Image; // The profile picture of that community
  communityBannerImage: Image; // The banner image of that community

  title: string; // Greater than 3 characters
  body: string | null; // Body of the post (only valid for text posts, null otherwise)
  image: Image | null; // The posted image (only valid for image posts, null otherwise)
  link:
    | {
        url: string; // The URL of the link.
        hostname: string; // The hostname of the link. For a URL of "https://discuit.net", this would be "discuit.net".
        // The image object of the OpenGraph image on the site. If no OpenGraph image was found, this is null.
        image: Image | null;
      }
    | undefined; // If the post is a link post, the link object, otherwise undefined.

  locked: boolean; // If the post was locked
  lockedBy: string | null; // Who locked the post.
  // In what capacity the post was locked, undefined if the post is not locked
  lockedByGroup: "owner" | "admins" | "mods" | undefined;
  lockedAt: Date | null; // Date at which the post was locked, null if the post is not locked

  upvotes: number; // The number of upvotes the post has
  downvotes: number; // The number of downvotes the post has
  hotness: number; // For ordering posts by 'hot'

  createdAt: Date; // The Date when the post was created
  editedAt: Date | null; // Last edited Date.
  // Either the post created Date or, if there are comments on the post, the Date the most recent comment was created at.
  lastActivityAt: Date;

  deleted: boolean; // If the post was deleted
  deletedAt: Date | null; // Date at which the post was deleted, null if the post has not been deleted
  deletedBy: string | null; // ID of the user who deleted the post.
  deletedAs: "normal" | "admins" | "mods" | undefined;
  // If true, the body of the post and all associated links or images are deleted.
  deletedContent: boolean;
  // In what capacity the content was deleted, undefined if the content has not been deleted.
  deletedContentAs: "normal" | "admins" | "mods" | undefined;

  noComments: number; // Comment count.
  comments: Comment[] | undefined; // Comments of the post.
  commentsNext: string | null; // Pagination cursor for comments.

  // Indicated whether the authenticated user has voted. If not authenticated, the value is null.
  userVoted: boolean | null;
  userVotedUp: boolean | null; // Indicates whether the authenticated user's vote is an upvote.

  // Both of these are false if the user has not been logged in.
  isAuthorMuted: boolean; // If the author of the post has been muted by the logged in user.
  isCommunityMuted: boolean; // If the community that the post is in has been muted by the logged in user.

  community: Community | undefined; // The Community object of the community that the post is in.
  author: User | undefined; // The User object of the author of the post.
};

type PostsResponse = {
  posts: Post[];
  next: string | null;
};

enum Sort {
  Hot = "hot",
  Activity = "activity",
  New = "new",
  Day = "day",
  Week = "week",
  Month = "month",
  Year = "year",
}

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

  async getPosts(sort: Sort = Sort.Hot, communityName?: string) {
    let url = `/api/posts?sort=${sort}`;
    if (communityName) {
      const community = await this.getCommunity(communityName);
      if (!community) throw new Error("Community not found");
      url += `&communityId=${community.id}`;
    }

    const response = await this.axios.get(url);
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
    description += ` • Posted by <a href="https://discuit.net/@${post.author.username}">@${post.author.username}</a>`;

    return {
      title:
        post.title +
        `${post.link ? " (Link)" : ""}` +
        `${post.image ? " (Image)" : ""}`,
      link: `https://discuit.net/${communityName}/post/${post.publicId}`,
      description: description,
      pubDate: new Date(post.createdAt).toUTCString(),
      author: post.author.username,
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

async function handleRSSRequest(req, res, communityName?: string) {
  const sort = req.query.sort || Sort.Hot;

  try {
    const posts = communityName
      ? await client.getPosts(communityName, sort)
      : await client.getPosts(sort);
    const rss = generateRSS(posts.posts, communityName || "all");
    res.set("Content-Type", "application/rss+xml");
    res.send(rss);
  } catch (error: any) {
    console.log(error);
    error.response
      ? res.status(error.response.status).send(error.response.data)
      : res.status(500).send("Internal Server Error");
  }
}

app.get("/:communityName", (req, res) => {
  const { communityName } = req.params;
  handleRSSRequest(req, res, communityName);
});

app.get("/", (req, res) => {
  handleRSSRequest(req, res);
});

app.listen(port, async () => {
  await client.init();
  console.log(`Server running on port ${port}`);
});
