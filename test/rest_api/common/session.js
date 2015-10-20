
var currentUser;

module.exports = {
  reset: function(){
    currentUser = undefined;
  },
  setCurrentUser: function(user){
    currentUser = user;
  },
  getCurrentUser: function(){
    return currentUser;
  }
};
