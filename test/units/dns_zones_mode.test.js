var expect = require('chai').expect;
var DNSZone = require('./../../models/DNSZone.js');

var _ = require('lodash');
var mongoose = require('mongoose');
var promise = require('bluebird');
mongoose.Promise = promise;

var config = require('config');
// var logger = require('revsw-logger')(config.log_config);

var PortalConnection = mongoose.createConnection(config.get('portal_mongo.connect_string'));
// var mongoConnection = require('../../lib/mongoConnections');
var DNSZoneModel = new DNSZone(mongoose, PortalConnection);
describe('Model App', function(){
  describe('Methods',function(){
    it('static method "accountDNSZonesCurrentData"',function(done){
      var accountId =  ['5588869fbde7a0d00338ce8f'/* Rev Test*/];
      var day = new Date('2017-02-28');
      DNSZoneModel.accountDNSZonesCurrentData(accountId)
        .then(function(data){
          console.log('data',data);
        })
        .then(done);
    });
  });
});
