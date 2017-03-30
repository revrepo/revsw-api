// NOTE: One time migration script
// Goal:
//  Change  ['meta.activity_target'] = 'purge' on [meta.activity_target] = 'domain'
//  and change [meta.target_id]

// TODO: delete this file after update data

var async = require('async');

var mongoose = require('mongoose');
var mongoConnection = require('./lib/mongoConnections');

var AuditEvents = require('./models/AuditEvents');
var DomainConfig = require('./models/DomainConfig');
var auditevents = new AuditEvents(mongoose, mongoConnection.getConnectionPortal());
var domainConfigs = new DomainConfig(mongoose, mongoConnection.getConnectionPortal());

function migrate() {
  auditevents.findAllPurgeActivityTarget(function(err, results) {
    if (err) {
      console.log('Error', err);
      return
    }
    console.log('Total records: ',results.length);
    async.each(results, function(item, cb) {
      domainConfigs.query({
        domain_name: item.domainName
      }, function updateOneRecord(error, domainList) {
        if (error || domainList.length === 0) {
          cb(null)
        } else {
          item.domainId = domainList[0]._id;
          console.log(item);
          // auditevents.changePurgeActivityTargetOnDomainActivityTarget(
          //   item,
          //   function(error, activity) {
          //     cb(null,   activity)
          //   })
        }
      })
    }, function(err, res) {
      console.log('work complete');
      return;
    });
  })
}

// run
migrate();
