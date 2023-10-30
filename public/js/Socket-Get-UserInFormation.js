async function  SocketGetUserInfo() {
socket.on('UserDetailAndAvatar', userdata => {

    // Get the user's name and ID from userdata
    var userName = userdata.UserDetail.user.name;
    var userId = userdata.UserDetail.user.id;

    // Create an anchor element (<a>) for the user's name
    var nameLink = document.createElement('a');
    nameLink.textContent = userName;
    nameLink.href = `https://www.pixiv.net/en/users/${userId}`;
    nameLink.target = '_blank'; // Open the link in a new tab

    // Set the title element's content to the nameLink
    var title = document.querySelector('.title');
    title.innerHTML = 'Gallery of ';
    title.appendChild(nameLink);

    // The rest of your code

    const downloadsPath = userdata.downloadsPath;
    var decodedSrc = `${downloadsPath}/${(userdata.UserDetail.user.avatar)}`;
    var avatarElements = document.querySelectorAll('.user-avatar');
    avatarElements.forEach(function (avatarElement) {
      // Set the src attribute of the avatar element
      avatarElement.setAttribute('src', decodedSrc);
    });

    const ProfileUser=userdata.UserDetail.profile;
    const User= userdata.UserDetail.user;
    var id = User.id;
    var is_followed=User.is_followed;
    var total_follow_users=ProfileUser.total_follow_users;
    var total_illust_bookmarks_public=ProfileUser.total_illust_bookmarks_public;
    var total_illusts=ProfileUser.total_illusts;
    const imageGalleryRow = document.getElementById('imageGalleryRow');
    const content = document.createElement('div');
    content.classList.add('d-flex');
    content.innerHTML = `
          <p class="userInfor">Is Followed: ${is_followed} </p>
          <p class="userInfor">Total Follow Users: ${total_follow_users} </p>
          <p class="userInfor">Total Illust Bookmarks Public: ${total_illust_bookmarks_public} </p>
          <p class="userInfor">Total Illusts: ${total_illusts}</p>
      </div>
    `;
    imageGalleryRow.appendChild(content);
  });
}