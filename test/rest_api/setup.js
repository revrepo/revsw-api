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

var config = require('config');
var Promise = require('bluebird');

var API = require('./common/api');

var join = Promise.join;

var users = [
  config.api.users.revAdmin,
  config.api.users.reseller,
  config.api.users.secondReseller,
  config.api.users.admin,
  config.api.users.user
];

var authenticateUser = function(user) {
  return API.resources.authenticate
    .createOne({ email: user.name, password: user.password })
    .then(function(response) {
      user.token = response.body.token;

      return user.token;
    });
};

// Global `before` hook
// Invoked before all test suites runned
before(function (done) {
  var usersPromises = users.map(function(user) {
    return authenticateUser(user);
  });

  join.apply(Promise, usersPromises)
    .then(function() {
      done();
    });
});

// Global `after` hook
// after(function (done) {
//   done();
// });


//  ----------------------------------------------------------------------------------------------//
//  more simple example

var justtaUser = config.api.users.user;

//  suite
describe('Bla-bla-bla testing suite:', function () {

  //  global `before` ...
  before(function (done) {
    return API.resources.authenticate
      .createOne({ email: justtaUser.name, password: justtaUser.password })
      .then(function(response) {
        justtaUser.token = response.body.token;
        API.session.setCurrentUser(justtaUser);

        done();
      });
  });
  //  global `after` ...
  // after(function (done) { ..................


