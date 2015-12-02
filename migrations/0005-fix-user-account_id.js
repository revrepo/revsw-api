var async = require('async');

exports.up = function(db, next) {
  var users = db.collection('User');

  async.waterfall([
    function(callback) {
      users.find({}).toArray(callback);
    },
    function(results, callback) {
      async.each(results, function(res, cb) {
        users.updateOne({ _id: res._id }, {
          $rename: { 'companyId': 'account_id' }
        }, cb);
      }, callback)
    }
  ], next);
};

exports.down = function(db, next) {
  var users = db.collection('User');

  async.waterfall([
    function(callback) {
      users.find({}).toArray(callback);
    },
    function(results, callback) {
      async.each(results, function(res, cb) {
        users.updateOne({ _id: res._id }, {
          $rename: { 'account_id': 'companyId' }
        }, cb);
      }, callback)
    }
  ], next);
};
