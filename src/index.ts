import express from "express";
import axios, {
  type AxiosRequestHeaders,
  type AxiosResponseHeaders,
} from "axios";
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

type Community = {
  id: string; // The ID of the community.
  userId: string; // ID of the user who created the community.

  name: string; // The name of the community.
  nsfw: boolean; // If the community hosts NSFW content.
  about: string | null; // The description of the community, null if no description was set. Maximum 2000 characters.

  noMembers: number; // The number of members of the community.

  proPic: Image; // The community icon.
  bannerImage: Image; // The community banner image.

  createdAt: Date; // The time at which the community was created.
  deletedAt: Date | null; // If the community was deleted, the time at which it was deleted, otherwise null.

  // If the community is a default community, only returned if the default communities are requested.
  isDefault: boolean | undefined;

  userJoined: boolean | null; // Indicates whether the authenticated user is a member. If not authenticated, this is null.
  userMod: boolean; // Indicates whether the authenticated user is a moderator. If not authenticated, this is null.

  mods: User[]; // The User objects of all of the moderators of the community.
  rules: CommunityRule[]; // The list of community rules. The list is empty if there are no rules.

  ReportDetails: {
    noReports: number; // The total number of reports.
    noPostReports: number; // The total number of posts reported.
    noCommentReports: number; // The total number of comments reported.
  } | null; // Only visible to moderators of the community, otherwise null.
};

type CommunityRule = {
  id: number; // The ID of the community rule.

  rule: string; // The title of the rule.
  description: string | null; // The description of the rule. If no description was set, this is null.

  communityId: string; // The ID of the community in which this is a rule.
  zIndex: number; // The index of the rule. A smaller value means that the rule is closer to the top.

  createdBy: string; // The ID of the user that created the rule.
  createdAt: Date; // The time at which the rule was created.
};

type User = {
  id: string; // The ID of the user.
  username: string; // The username of the user. Minimum 3 characters. Maximum 21 characters.

  email: string | null; // If an email address was provided, the email address of the user, otherwise null.
  emailConfirmedAt: Date | null; // If the email address was confirmed, the time at which it was confirmed, otherwise null.

  aboutMe: string | null; // The about set by the user. Maximum 10000 characters. If no about was set, this is null.
  points: number; // The number of points that the user has.

  isAdmin: boolean; // If the user is an admin.
  proPic: Image | null; // If a profile picture was set, the profile picture of the user, otherwise null.
  badges: Badge[]; // The list of badges that the user has, can be empty.

  noPosts: number; // The number of posts the user has made.
  noComments: number; // The number of comments the user has made.

  createdAt: Date; // The time at which the account was created.
  deleted: boolean; // If the account has been deleted.
  deletedAt: Date | null | undefined; // If the account was deleted, the time at which it was deleted, otherwise null.

  upvoteNotificationsOff: boolean; // If the user has turned off upvote notifications.
  replyNotificationsOff: boolean; // If the user has turned off reply notifications.
  homeFeed: "all" | "subscriptions"; // The feed the user has set as their home feed.
  rememberFeedSort: boolean; // If the user wants their feed sort to be remembered.
  embedsOff: boolean; // If the user wants to turn off embeds for link posts.
  hideUserProfilePictures: boolean; // If the user wants to hide other users' profile pictures.

  bannedAt: Date | null; // If the user was banned, the time at which they were banned, otherwise null.
  isBanned: boolean; // If the user was banned.

  notificationsNewCount: number; // The number of new notifications the user has.

  // If the user is a moderator in any communities, the list of communities that the user moderates, otherwise null.
  moddingList: Community[] | null;
};

type Badge = {
  id: number; // The ID of the badge.
  type: string; // The type of badge.
};

type PostsResponse = {
  posts: Post[];
  next: string | null;
};

type UserFeedResponse = {
  items: UserFeedItem[];
  next: string | null;
};

type UserFeedItem = {
  item: Post | Comment;
  type: "post" | "comment";
};

// noinspection JSUnusedGlobalSymbols
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

async function handleRSSRequest(
  req: AxiosRequestHeaders,
  res: AxiosResponseHeaders,
  limit?: number,
  name?: string,
  isUser?: boolean,
) {
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
    const limit = req.query.limit;
    handleRSSRequest(req, res, limit, username, true);
  },
);

app.get(
  "/:communityName",
  (req: AxiosRequestHeaders, res: AxiosResponseHeaders) => {
    const { communityName } = req.params;
    const limit = req.query.limit;
    handleRSSRequest(req, res, limit, communityName);
  },
);

app.get("/", (req: AxiosRequestHeaders, res: AxiosResponseHeaders) => {
  handleRSSRequest(req, res);
});

app.listen(port, async () => {
  await client.init();
  console.log(`Server running on port ${port}`);
});
