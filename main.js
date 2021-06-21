const axios = require("axios").default;

// axios.get("https://astralcodexten.substack.com/api/v1/post/34926692/comments?all_comments=true&sort=newest_first").then(response => console.log(response.data.comments))

// const comments = `https://astralcodexten.substack.com/api/v1/post/${post_id}/comments?all_comments=true&sort=newest_first`

async function postIDOffset(offset) {
  // Post are given by batches of 12 even if you increase the limit, so we have to increase the offset
  const response = await axios.get(`https://astralcodexten.substack.com/api/v1/archive?sort=new&search=&offset=${offset}&limit=12`);

  if (response.data.length == 0) {
    return [];
  } else {
    const postIds = response.data.map(post => post.id);
    return postIds;
  }
}

async function allPostIDs() {
  let postIds = [];
  let offset = 0;

  let currentIds = await postIDOffset(offset);
  postIds = postIds.concat(currentIds);
  offset += 12;

  while (currentIds.length != 0) {
    currentIds = await postIDOffset(offset);
    postIds = postIds.concat(currentIds);
    offset += 12;
  }

  return postIds;
}

allPostIDs().then(ids =>  { 
  require("fs").writeFileSync("ids.txt", ids.join(", "));
})