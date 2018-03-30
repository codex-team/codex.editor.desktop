/**
 * Sync Query
 * @type {string}
 */
module.exports = `query Sync($userId: ID!) {
  user(id: $userId){
    id,
    name,
    email,
    photo,
    googleId,
    dtReg,
    dtModify,
    folders {
      id,
      title,
      owner {
        name,
        id
      },
      isRoot,
      dtModify,
      dtCreate,
      isRemoved,
      notes {
        id,
        title,
        dtCreate,
        dtModify,
        content,
        author {
          id,
          name,
          email
        },
        isRemoved
      },
      collaborators {
        id, 
        token,
        email
        user {
          id,
          name,
          email,
          photo
        },
        dtInvite
      }
    }
  }
}`;
