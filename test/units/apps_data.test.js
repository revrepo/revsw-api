var expect = require('chai').expect;
var App = require('./../../models/App.js');

var _ = require('lodash');
var mongoose = require('mongoose');
var promise = require('bluebird');
mongoose.Promise = promise;

var config = require('config');
var logger = require('revsw-logger')(config.log_config);
// var utils = require( '../lib/utilities.js' );
// var es = require( '../lib/elasticSearch' );
// var mail = require('../lib/mail');
var PortalConnection = mongoose.createConnection(config.get('portal_mongo.connect_string'));
// var mongoConnection = require('../../lib/mongoConnections');
var applicationsModel = new App(mongoose, PortalConnection);
describe('Model App', function(){
  describe('Methods',function(){
    it('static method "accountAppsPerPlatformData"',function(done){
      var accountId =  '5714b425fce0aa6415edd853';
      var day = new Date('2017-02-28');
      applicationsModel.accountAppsPerPlatformData(accountId,day)
        .then(function(data){
          console.log(data);
          // expect().to.be.exist();
        })
        .then(done);
    });
  });
});
