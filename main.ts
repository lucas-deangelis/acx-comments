import axios from "axios";

// const comments = `https://astralcodexten.substack.com/api/v1/post/${post_id}/comments?all_comments=true&sort=newest_first`

/*
  What we want from the JSON of a comment:
  - body: the text of the comment
  - date: the date of publication
  - name: the name of the commenter
  - photo_url: the profile pic of the commenter
  - is_author: if the commenter is the author of the blog
  - children: an array of children, which are also comments. Is an empty list if there are no comments
*/

import { writeFileSync } from "fs";

interface Comment {
  author: string;
  date: string;
  text: string;
  photo_url: string;
  is_author: boolean;
  children: Array<Comment>;
}

function parseComment(comment: any): Comment {
  let children = [];

  if (comment.children.length != 0) {
    children = comment.children.map(parseComment);
  }

  return {
    author: comment.name,
    date: comment.date,
    text: comment.body,
    photo_url: comment.photo_url,
    is_author: comment.is_author,
    children: children,
  };
}

function treatDate(date: string): string {
  // From 2021-04-09T03:21:47.408Z to 2021-04-09 03:21:47
  return date.replace("T", " ").slice(0, 19);
}

function sanitize(text: string): string {
  if (!text) {
    return "";
  } else {
    let currentText = text.replace(/\</g, "&lt;").replace(/\>/g, "&gt;");
    currentText = "<p>" + currentText;
    currentText = currentText.replace(/\n\n/g, "</p><p>");
    return currentText + "</p>";
  }
}

function transformComment(parsedComment: Comment): string {
  let children: Array<string> = [];

  if (parsedComment.children.length > 0) {
    children = parsedComment.children.map(transformComment);
  } else {
    children = [];
  }

  const singleComment = `<div class="comment">
<div class="comment-head">
  <img
    class="profile-image"
    src="${parsedComment.photo_url}"
  />
</div>
<div class="comment-body">
  <div class="comment-meta">
    <div class="comment-poster">${parsedComment.author}</div>
    <div class="comment-time">${treatDate(parsedComment.date)}</div>
  </div>
  <div class="comment-text">
    ${sanitize(parsedComment.text)}
  </div>
  <div class="children">
    ${children.join("")}
  </div>
</div>
</div>`;

  return singleComment;
}

interface Post {
  id: number;
  title: string;
  date: string;
  url: string;
  commentsCount: number;
  likesCount: number;
}

async function postIDOffset(offset: number): Promise<Array<Post>> {
  // Post are given by batches of 12 even if you increase the limit, so we have to increase the offset
  const response = await axios.get(
    `https://astralcodexten.substack.com/api/v1/archive?sort=new&search=&offset=${offset}&limit=12`
  );

  if (response.data.length == 0) {
    return [];
  } else {
    const posts = response.data.map((post) => {
      return {
        id: post.id,
        title: post.title,
        date: post.post_date,
        url: post.canonical_url,
        commentsCount: post.comment_count,
        likesCount: post.reactions["❤"],
      };
    });
    return posts;
  }
}

async function allPosts(): Promise<Array<Post>> {
  let posts: Array<Post> = [];
  let offset = 0;

  let currentIds = await postIDOffset(offset);
  posts = posts.concat(currentIds);
  offset += 12;

  while (currentIds.length != 0) {
    currentIds = await postIDOffset(offset);
    posts = posts.concat(currentIds);
    offset += 12;
  }

  return posts;
}

// Transform an article object into the HTML
async function outputArticle(articleData: Post): Promise<string> {
  const response = await axios.get(
    `https://astralcodexten.substack.com/api/v1/post/${articleData.id}/comments?all_comments=true&sort=newest_first`
  );
  const comments = response.data.comments;

  const parsedComments: Array<Comment> = comments.map((comment: Record<string, unknown>) => parseComment(comment));
  const transformedComments: Array<string> = parsedComments.map((parsedComment) =>
    transformComment(parsedComment)
  );

  const commentsHTML = transformedComments.join("");

  const template = `<div class="article">
  <div class="article-head">
    <a
      href="${articleData.url}"
      class="article-name"
      ><h2>${articleData.title}</h2></a
    >
    <div class="article-metadata">
      <div class="metadata-item article-time">
        ${treatDate(articleData.date)}
      </div>
      <div class="metadata-item">
        <div class="article-comments-count">
          <svg
            role="img"
            width="14"
            height="20"
            viewBox="0 0 14 20"
            fill="none"
            stroke-width="1"
            stroke="#000"
            xmlns="http://www.w3.org/2000/svg"
            style="height: 20px; width: 14px"
          >
            <g>
              <title>Comment</title>
              <path
                d="M7.47092 13.7982L7.32727 13.6656H7.13176H2.14118C1.22171 13.6656 0.5 12.944 0.5 12.0679V6.09766C0.5 5.22165 1.22171 4.5 2.14118 4.5H11.8588C12.7783 4.5 13.5 5.22165 13.5 6.09766V12.0679C13.5 12.944 12.7783 13.6656 11.8588 13.6656H10.5412H10.0412V14.1656V16.1657C10.0392 16.1649 10.0339 16.1625 10.0255 16.1565L7.47092 13.7982Z"
                stroke="#999999"
              ></path>
            </g></svg
          ><div>${articleData.commentsCount}</div>
          </div>
      </div>
      <div class="metadata-item">
        <div class="article-likes-count">
          <svg
            role="img"
            width="15"
            height="20"
            viewBox="0 0 15 20"
            fill="none"
            stroke-width="1"
            stroke="#000"
            xmlns="http://www.w3.org/2000/svg"
            style="height: 20px; width: 15px"
          >
            <g>
              <title></title>
              <path
                d="M1.73624 5.1145C2.43974 4.37137 3.37095 4 4.3036 4C5.23626 4 6.16745 4.37137 6.87097 5.1145L7.49949 5.77892L8.1227 5.11986C9.52973 3.63357 11.8557 3.6336 13.2627 5.11986C14.6698 6.60612 14.6698 8.98642 13.2627 10.4727C11.4639 12.3728 9.66583 14.2737 7.86703 16.1738C7.81927 16.2242 7.76183 16.2643 7.6982 16.2918C7.63456 16.3192 7.56606 16.3333 7.49683 16.3333C7.42761 16.3333 7.3591 16.3192 7.29547 16.2918C7.23184 16.2643 7.1744 16.2242 7.12664 16.1738L5.77904 14.7472L3.08384 11.8939L1.73624 10.4673C0.331003 8.98011 0.329213 6.60074 1.73624 5.1145Z"
                stroke="#999999"
              ></path>
            </g></svg
          >
          <div>${articleData.likesCount}</div>
          </div>
      </div>
    </div>
  </div>

  ${commentsHTML}
  
  <hr />
</div>`;

  return template;
}

async function allArticles(): Promise<string> {
  const articlesData = await allPosts();

  const articlesHTML = await Promise.all(
    articlesData.map((article) => outputArticle(article))
  );

  const articlesString = articlesHTML.join("");

  const template = `<!DOCTYPE html>
  <html lang="en">
    <head>
      <meta charset="UTF-8" />
      <meta http-equiv="X-UA-Compatible" content="IE=edge" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <title>Document</title>
      <style>
        html {
          display: flex;
          justify-content: center;
        }
  
        body {
          max-width: 900px;
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto,
            Helvetica, Arial, sans-serif, "Apple Color Emoji", "Segoe UI Emoji",
            "Segoe UI Symbol";
        }
  
        .profile-image {
          width: 33px;
          height: 33px;
          border-radius: 50%;
        }
  
        .comment-head {
          margin-right: 10px;
        }
  
        .comment {
          display: flex;
          flex-direction: row;
          margin-top: 20px;
        }
  
        .comment-body {
          display: flex;
          flex-direction: column;
        }
  
        .comment-meta {
          display: flex;
          flex-direction: row;
          margin-bottom: 5px;
        }
  
        .comment-poster {
          font-weight: 700;
          margin-right: 10px;
        }
  
        .comment-time,
        .article-time {
          color: #7a7a7a;
        }
  
        p {
          margin-top: 0;
        }
  
        .children {
          display: flex;
          flex-direction: column;
        }
  
        h2 {
          font-size: 2em;
          font-weight: bold;
          color: black;
        }
  
        .article-name {
          text-decoration: none;
        }
  
        .article-metadata {
          display: flex;
          flex-direction: row;
          align-items: center;
          color: #7a7a7a;
        }
  
        .metadata-item {
          margin-right: 20px;
        }
  
        svg {
          margin-right: 5px;
        }
  
        .article-comments-count, .article-likes-count {
          display: flex;
          flex-direction: row;
          align-items: center;
          justify-content: center;
        }
  
        hr {
          height: 2px;
          background-color: black;
        }
      </style>
    </head>
    <body>
      ${articlesString}
    </body>
  </html>`;

  return template;
}

allArticles().then((html) => writeFileSync("index.html", html));
