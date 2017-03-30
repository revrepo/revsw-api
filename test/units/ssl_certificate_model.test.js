var expect = require('chai').expect;
var SSLCertificate = require('./../../models/SSLCertificate.js');

var _ = require('lodash');
var mongoose = require('mongoose');
var promise = require('bluebird');
mongoose.Promise = promise;

var config = require('config');
// var logger = require('revsw-logger')(config.log_config);

var PortalConnection = mongoose.createConnection(config.get('portal_mongo.connect_string'));
// var mongoConnection = require('../../lib/mongoConnections');
var SSLCertificateModel = new SSLCertificate(mongoose, PortalConnection);
describe('Model App', function(){
  describe('Methods',function(){
    it('static method "accountSSLCertificateData"',function(done){
      var accountId =  ['5786f8afe082608b3ef00d53','562008f345fdea0a0799cf13'];//['5714b425fce0aa6415edd853','5723e997bd75f6e7668dbe26'];
      var day = new Date('2017-02-28');
      SSLCertificateModel.accountSSLCertificateData(accountId,day)
        .then(function(data){
          console.log(data);
        })
        .then(done);
    });
  });
});
