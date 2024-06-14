function filterIllustrations(illustrations, options) {
  let filteredIlustrations = illustrations;

  if (options.tags === undefined && options.minBookmarkCount != undefined) {
  filteredIlustrations = illustrations.filter(illust => {
    return illust.total_bookmarks > options.minBookmarkCount;
  });
} else if (options.tags != undefined) {
  let includeTags = [];
  let excludeTags = [];

  for (let i = 0; i < options.tags.length; i++) {
    let tag = options.tags[i];
    if (tag.startsWith("-")) {
      excludeTags.push(tag.substr(1));
    } else {
      includeTags.push(tag);
    }
  }

  filteredIlustrations = illustrations.filter(illust => {
    let hasMatchingIncludeTags = includeTags.every(tag => illust.tags.some(t => t.name === tag || t.translated_name === tag));
    let hasMatchingExcludeTags = excludeTags.some(tag => illust.tags.some(t => t.name === tag || t.translated_name === tag));

    return hasMatchingIncludeTags && !hasMatchingExcludeTags && illust.total_bookmarks > options.minBookmarkCount;
  });
}

  return filteredIlustrations;
}
async function getBookmarkedIllustrations(pixiv, options) {
  let response = await pixiv.userBookmarksIllust(options);
  let bookmarkedIllustrations = response.data.illusts;
  let filteredIlustrations = filterIllustrations(bookmarkedIllustrations, options);
  return {
    illustrations: filteredIlustrations,
    nextURL: response.data.next_url
  };
}
async function getUserBookmarkedIllustrations(pixiv, options) {
  let response = await pixiv.userBookmarksIllust(options);
  let bookmarkedIllustrations = response.data.illusts;
  let filteredIlustrations = filterIllustrations(bookmarkedIllustrations, options);
  return {
    illustrations: filteredIlustrations,
    nextURL: response.data.next_url
  };
}



  async function getRecommendedIllustrations(pixiv, options) {
    options = {
      ...options,
      include_ranking_illusts: true,
    };
    let response = await pixiv.illustRecommended(options);
    let RecommendedIllustrations = response.data.illusts;
    let filteredIlustrations = filterIllustrations(RecommendedIllustrations, options);
    return {
      illustrations: filteredIlustrations,
      nextURL: response.data.next_url
    };
  }
  async function getUserIllustrations(pixiv, options) {
    let response = await pixiv.userIllusts(options);
    let UserIllustrations = response.data.illusts;
    let filteredIlustrations = filterIllustrations(UserIllustrations, options);
    return {
      illustrations: filteredIlustrations,
      nextURL: response.data.next_url
    };
  }
  async function getUserDetail(pixiv, options) {
    let response = await pixiv.userDetail(options);
    let Userdetail = response.data; 
    return Userdetail;
  }
  async function getillustBookmarkAdd(pixiv, options) {
    let response = await pixiv.illustBookmarkAdd(options);
    let responsereturn = response.statusText; 
    return responsereturn;
  }
  async function illustBookmarkDelete(pixiv, options) {
    let response = await pixiv.illustBookmarkDelete(options);
    let responsereturn = response.statusText; 
    return responsereturn;
  }
  async function getIllustrations(pixiv, options) {
    let response = await pixiv.searchIllust(options);
    let SearchIllustrations = response.data.illusts;
    let filteredIlustrations = filterIllustrations(SearchIllustrations, options);
    return {
      illustrations: filteredIlustrations,
      nextURL: response.data.next_url
    };
  }
  async function getRankingIllusts(pixiv, options) {
    let response = await pixiv.IllustsRanking(options);
    let RankingIllustrations = response.data.illusts;
    options=
    {
      ...options,
      mode: options.mode || "day",
      date:options.date || "",
      offset: options.offset || 0,
    }
    let filteredIlustrations = filterIllustrations(RankingIllustrations, options);
    return {
      illustrations: filteredIlustrations,
      nextURL: response.data.next_url
    };
  }
  async function getLatestIllustrations(pixiv, options) {
    let response = await pixiv.latestWork(options);
    let latestwork = response.data.illusts;
    let filteredIlustrations = filterIllustrations(latestwork, options);
    return {
      illustrations: filteredIlustrations,
      nextURL: response.data.next_url
    };
  }
  async function getRelatedIllustrations(pixiv, options) {
    try{
      let response = await pixiv.IllustRelated(options);
      let relatedIllusts = response.data.illusts;
      let filteredIlustrations = filterIllustrations(relatedIllusts, options);
      return {
        illustrations: filteredIlustrations,
        nextURL: response.data.next_url
      };
    }
    catch (error) {
      // You can rethrow the error here if you want to propagate it up the call stack
      return error;
    }
  }

    module.exports = {getBookmarkedIllustrations,
        getRecommendedIllustrations,
        getUserIllustrations,
        getUserDetail,
        getillustBookmarkAdd,
        illustBookmarkDelete,
        getIllustrations,
        getRankingIllusts,
        getLatestIllustrations,
        getRelatedIllustrations,
        getUserBookmarkedIllustrations,
    }
    ;

