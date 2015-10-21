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

// # Base Resource object

// Required third-party libraries.
var Promise = require('bluebird');
var request = require('supertest-as-promised');

// Required components form rest-api framework.
var Session = require('./../session');

/**
 * ### BaseResource.constructor()
 *
 * Base implementation for Resource which defines all actions that could be
 * performed by triggering requests (using supported methods) to the REST API.
 *
 * @param {object} config, objet with configuration properties as follow:
 *
 *     {
 *       host: config.api.host,
 *       apiVersion: config.api.version,
 *       apiResource: config.api.resources.accounts
 *     }
 * @returns {object} which allows the user to perform some actions. With the
 * following schema:
 *
 *     {
 *         getAll: Function,
 *         getOne: Function,
 *         createOne: Function,
 *         createOneAsPrerequisite: Function,
 *         update: Function,
 *         deleteOne: Function,
 *         deleteMany: Function,
 *         deleteAllPrerequisites: Function,
 *         rememberAsPrerequisite: Function,
 *         forgetPrerequisite: Function
 *     }
 *
 * @constructor
 *
 */
var BaseResource = function(config) {

  // Private properties
  var _cache = [];
  var _host = config.host;
  var _url = _host.protocol + '://' + _host.name + ':' + _host.port;
  var _location = '/' + config.apiVersion + '/' + config.apiResource;
  var _ext = config.ext;

  // #### Helper function _getRequest
  //
  // Create an instance of super-test request which already has the reference
  // to the REST API HOST to point.
  var _getRequest = function(){
    return request(_url);
  };

  // #### Helper function _getRequest
  //
  // In case there is a session with a current user, authenticates that user to
  // perform the API call.
  //
  // Receives as param the request instance
  var _setUserToRequest = function(request){
    var user = Session.getCurrentUser();
    if (user) {
      return request.auth(user.name, user.password);
    }
    return request;
  };

  // #### Helper function _getRequest
  //
  // Return s the URI resource to consume from the REST API.
  //
  // Receives as param the request instance
   var _getLocation = function(id){
    if (id) {
      return _location + '/' + id + (_ext ? _ext : '');
    }
    return _location + (_ext ? _ext : '');
  };

  return {

    /**
     * ### BaseResource.getAll()
     *
     * Sends a GET request to the API in order to get all object from the
     * requested type.
     *
     * @returns {object} the supertest-as-promised instance
     */
    getAll: function(){
      var location = _getLocation();
      var request = _getRequest()
        .get(location);
      return _setUserToRequest(request);
    },

    /**
     * ### BaseResource.getOne()
     *
     * Sends a GET request to the API in order to get the object from the
     * requested type.
     *
     * @param {String} id, the uuid of the object
     *
     * @returns {object} the supertest-as-promised instance
     */
    getOne: function(id){
      var location = _getLocation(id);
      var request = _getRequest()
        .get(location);
      return _setUserToRequest(request);
    },

    /**
     * ### BaseResource.createOne()
     *
     * Creates a new object form the requested type.
     *
     * @param {object} the supertest-as-promised instance
     *
     * @returns {object} the supertest-as-promised instance
     */
    createOne: function(object){
      var location = _getLocation();
      var request = _getRequest()
        .post(location)
        .send(object);
      return _setUserToRequest(request);
    },

    /**
     * ### BaseResource.createOneAsPrerequisite()
     *
     * Creates a new object form the requested type and stores its ID in the
     * _cache object property (which stores all IDs from all pre-requisite
     * objects created). all of this is to make sure application under testing
     * does not become messed up after the testing.
     *
     * @param {object} the supertest-as-promised instance
     *
     * @returns {object} the supertest-as-promised instance
     */
    createOneAsPrerequisite: function(object){
      return this.createOne(object)
        .then(function(res){
          _cache.push(res.body.object_id);
          return res;
        });
    },

    /**
     * ### BaseResource.update()
     *
     * Sends the PUT request to the API in order to update specified object with
     * given data.
     *
     * @param {string} id, the uui of the object
     * @param {object} object with the information/properties from the object
     * to update.
     *
     * @returns {object} the supertest-as-promised instance
     */
    update: function(id, object){
      var location = _getLocation(id);
      var request = _getRequest()
        .put(location)
        .send(object);
      return _setUserToRequest(request);
    },

    /**
     * ### BaseResource.deleteOne()
     *
     * Sends the DELETE request to the API in order to delete specified object
     * with given ID.
     *
     * @param {string} id, the uui of the object
     *
     * @returns {object} the supertest-as-promised instance
     */
    deleteOne: function(id){
      var location = _getLocation(id);
      var request = _getRequest()
        .del(location);
      return _setUserToRequest(request);
    },

    /**
     * ### BaseResource.deleteMany()
     *
     * Sends the DELETE request to the API in order to delete specified objects
     * with given IDs. All request are run in parallel using promises.
     *
     * @param {Array} ids, list/array of the uuids of the objects to delete
     *
     * @returns {object} a promise instance
     */
    deleteMany: function(ids){
      var me = this;
      var deletions = [];
      ids.forEach(function(id){
        deletions.push(me
          .deleteOne(id)
          .then());
      });
      return Promise
        .all(deletions)
        .then(function (res) {
          // What to do in case a pre-requisite is deleted successfully?
        })
        .catch(function (err) {
          // What to do in case a pre-requisite is NOT deleted successfully?
        });
    },

    /**
     * ### BaseResource.deleteAllPrerequisites()
     *
     * @returns {object} the supertest-as-promised instance
     */
    deleteAllPrerequisites: function () {
      return this.deleteMany(_cache);
    },

    /**
     * ### BaseResource.rememberAsPrerequisite()
     *
     * Register an ID in order to handle it later (while cleaning up the
     * application) as a pre-requisite.
     *
     * @param {string} id, the uui of the object
     */
    rememberAsPrerequisite: function(id){
      var index = _cache.indexOf(id);
      if (index === -1) {
        _cache.push(id);
      }
    },

    /**
     * ### BaseResource.forgetPrerequisite()
     *
     * Forgets an ID in order to avoid handling it later (while cleaning up the
     * application) as a pre-requisite.
     *
     * @param {string} id, the uui of the object
     */
    forgetPrerequisite: function(id){
      var index = _cache.indexOf(id);
      if (index > -1) {
        _cache.splice(index, 1);
      }
    }
  };
};

// Exports the `BaseResource` class as module
module.exports = BaseResource;
