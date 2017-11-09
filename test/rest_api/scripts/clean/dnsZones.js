/*************************************************************************
 *
 * REV SOFTWARE CONFIDENTIAL
 *
 * [2013] - [2017] Rev Software, Inc.
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
var API = require('./../../common/api');
var request = require('supertest-as-promised');
var _ = require('lodash');
var async = require('async');
describe('Clean up', function () {

  // Changing default mocha's timeout (Default is 2 seconds).
  this.timeout(config.get('api.request.maxTimeout'));

  var users = [
    config.get('api.users.revAdmin'),
    config.get('api.users.reseller'),
    config.get('api.users.admin')
  ];
  var namePattern = /[0-9]{13}/;

  describe('DNS Zones', function () {

    users.forEach(function (user) {

      describe('With user: ' + user.role, function () {

        it('should clean DNS Zones created for testing.',
          function (done) {
            API.helpers
              .authenticateUser(user)
              .then(function () {
                API.helpers.dnsZones
                  .cleanup(namePattern)
                  .finally(done);
              })
              .catch(done);
          });
      });
    });
    // NOTE: use this test only for clean QA DNS Zones
    xdescribe('Native clean NSONE: ', function() {
      var dnsZonesList = [];
      before(function(done){
        API.helpers
          .authenticateUser(config.get('api.users.revAdmin'))
          .then(function(){
            return API.resources.dnsZones
              .getAll()
              .then(function(data){
                dnsZonesList = data.body;
                // console.log('DB list', dnsZonesList);
                return data;
              });
          })
          .then(function(){
            done();
          })
          .catch(done);
      });

      it('should clean NSONE not used QA DNS Zones',function(done){
        var deleteZone = [];
        var namePattern = /[0-9]{13}/;
        request('https://api.nsone.net')

          .get('/v1/zones')
          .set({ 'X-NSONE-Key': 'f8MXIsOKoGevPM2o7LUG' })
          .expect(200)
          .then(function( data){
            deleteZone = _.filter(data.body,function(item){
              return (_.findIndex(dnsZonesList, { zone: item.zone }) === -1 && namePattern.test(item.zone)=== true);
            }).map(function(item){
              return item.zone;
            });
            if(deleteZone.length>0){
              async.map(deleteZone,function(item,cb){
                request('https://api.nsone.net')
                  .delete('/v1/zones/' + item)
                  .set({ 'X-NSONE-Key': 'f8MXIsOKoGevPM2o7LUG' })
                  .expect(200)
                  .then(function() {
                    console.log('try delete', item)
                    cb();
                  })
                  .catch(function(){
                    cb();
                  });


              },function(err,data){
                done();
              });
            }else{
             done();
            }

          })
          .catch(function(err){
            // console.log('err', err)
            done(err);
          });
        // if(dnsZonesList.length>0){
        //   console.log('DB', data.length)
        // }
      });
    });
  });
});
