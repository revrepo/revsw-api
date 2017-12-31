/*************************************************************************
 *
 * REV SOFTWARE CONFIDENTIAL
 *
 * [2013] - [2015] Rev Software, Inc.
 * All Rights Reserved.
 *
 * NOTICE:  All information contained herein is, and remains
 * the property of Rev Software, Inc. and its suppliers,
 * if any.  The intellectual and technical concepts contained
 * herein are proprietary to Rev Software, Inc.
 * and its suppliers and may be covered by U.S. and Foreign Patents,
 * patents in process, and are protected by trade secret or copyright law.
 * Dissemination of this information or reproduction of this material
 * is strictly forbidden unless prior written permission is obtained
 * from Rev Software, Inc.
 */

// # Session object

// This object stores in memory information about the current user being used.
// It also provides additional methods to retrieve, update or reset that
// information. Re-setting means as if no user was authenticated
var currentUser;
var currentAzureKey;

var Session = {
  reset: function(){
    currentUser = undefined;
    currentAzureKey = undefined;
  },
  resetUser: function () {
    currentUser = undefined;
  },
  setCurrentUser: function(user){
    currentUser = user;
  },
  getCurrentUser: function(){
    return currentUser;
  },
  setCurrentAzureKey: function (key) {
    currentAzureKey = key;
  },
  getCurrentAzureKey: function () {
    return currentAzureKey;
  },
  resetAzureKey: function () {
    currentAzureKey = undefined;
  }
};

module.exports = Session;