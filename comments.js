/*
  What we want from the JSON of a comment:
  - body: the text of the comment
  - date: the date of publication
  - name: the name of the commenter
  - photo_url: the profile pic of the commenter
  - is_author: if the commenter is the author of the blog
  - children: an array of children, which are also comments. Is an empty list if there are no comments
*/

const { parse } = require("path");

function parseComment(comment) {
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
  }
}

function treatDate(date) {
  // From 2021-04-09T03:21:47.408Z to 2021-04-09 03:21:47
  return date.replace("T", " ").slice(0, 19);
}

function transformComment(parsedComment) {
  let children = [];

  if (typeof parsedComment.children == "undefined") {
    console.log(parsedComment);
  }

  if (parsedComment.children.length > 0) {
    children = parsedComment.children.map(transformComment);
  } else {
    children = "";
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
    ${parsedComment.text}
  </div>
  <div class="children">
    ${children}
  </div>
</div>
</div>`

  return singleComment;
}


let aComment = require("fs").readFileSync("comment.json");

let parsedComment = parseComment(JSON.parse(aComment));
let transformedComment = transformComment(parsedComment);

console.log(transformedComment);