// Required third-party libraries.
var Promise = require('bluebird');
var request = require('supertest-as-promised');

// Required components form rest-api framework.
var Session = require('./../session');

// Base implementation for Resource which defines all actions that could be
// performed by triggering requests (using supported methods) to the REST API.
var BaseResource = function(config) {

  // Private properties
  var _cache = [];
  var _host = config.host;
  var _url = _host.protocol + '://' + _host.name + ':' + _host.port;
  var _location = '/' + config.apiVersion + '/' + config.apiResource;
  var _ext = config.ext;

  // Create an instance of super-test request which already has the reference
  // to the REST API HOST to point.
  var _getRequest = function(){
    //console.log('URL:', _url);
    return request(_url);
  };

  var _setUserToRequest = function(request){
    var user = Session.getCurrentUser();
    if (user) {
      //console.log('setUser:', user, request === undefined);
      return request.auth(user.name, user.password);
    }
    //console.log('setUser:', request === undefined);
    return request;
  };

  var _getLocation = function(id){
    //console.log('_getLocation', _location);
    if (id) {
      //console.log('_getLocation', _location + '/' + id + (_ext ? _ext : ''));
      return _location + '/' + id + (_ext ? _ext : '');
    }
    //console.log('_getLocation', _location + (_ext ? _ext : ''));
    return _location + (_ext ? _ext : '');
  };

  return {

    getAll: function(){
      var location = _getLocation();
      var request = _getRequest()
        .get(location);
      //console.log('getAll:', location, request === undefined);
      return _setUserToRequest(request);
    },

    getOne: function(id){
      var location = _getLocation(id);
      var request = _getRequest()
        .get(location);
      //console.log('getOne:', request === undefined);
      return _setUserToRequest(request);
    },

    createOne: function(object){
      var location = _getLocation();
      var request = _getRequest()
        .post(location)
        .send(object);
      return _setUserToRequest(request);
    },

    createOneAsPrerequisite: function(object){
      return this.createOne(object)
        .then(function(res){
          _cache.push(res.body.object_id);
          //console.log(res.body);
          return res;
        });
    },

    update: function(id, object){
      var location = _getLocation(id);
      var request = _getRequest()
        .put(location)
        .send(object);
      return _setUserToRequest(request);
    },

    remove: function(id){
      var location = _getLocation(id);
      var request = _getRequest()
        .del(location);
      return _setUserToRequest(request);
    },

    removeMany: function(ids){
      var me = this;
      var deletions = [];
      ids.forEach(function(id){
        deletions.push(me
          .remove(id)
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

    removeAllPrerequisites: function () {
      return this.removeMany(_cache);
    },

    rememberAsPrerequisite: function(id){
      var index = _cache.indexOf(id);
      if (index === -1) {
        _cache.push(id);
      }
    },

    forgetPrerequisite: function(id){
      var index = _cache.indexOf(id);
      if (index > -1) {
        _cache.splice(index, 1);
      }
    }
  };
};

module.exports = BaseResource;
