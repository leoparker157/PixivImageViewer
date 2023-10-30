

const axios = require('axios');
const fs = require('fs');
const path = require("path");
var sanitize = require("sanitize-filename");
const { Pixiv} = require('@book000/pixivts');
async function setupPixiv(refreshToken) {
    try {
      const pixiv = await Pixiv.of(refreshToken);
      const options = {
        userId: pixiv.userId,
        // userId: 76246688,
        maxBookmarkId: undefined,
      };
      return { pixiv, options, Pixiv };
    } catch (error) {
      console.error("Failed to set up Pixiv:", error);
      return null; // Return null when the Pixiv setup fails
    }
  }
  
async function SetupPixivbyID(userId){
    const pixiv = await Pixiv.of(userId);
    const options = {
        userId: pixiv.userId,
        maxBookmarkId: undefined,             
    };
    return {pixiv,options,Pixiv};
    }
   




module.exports = {
    axios,
    fs,
    path,
    sanitize,
    setupPixiv,
    SetupPixivbyID,
};