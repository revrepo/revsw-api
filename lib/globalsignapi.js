/*************************************************************************
 *
 * REV SOFTWARE CONFIDENTIAL
 *
 * [2013] - [2016] Rev Software, Inc.
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

'use strict';

var soap = require('soap'),
  events = require('events'),
  sys = require('util'),
  config = require('config');


var GSAPI = function () {
  var self = this;

  this.sanStatusCode = {
    '1': 'Waiting for approval',
    '2': 'Customer Approved',
    '3': 'Approved',
    '7': 'Flagged for phishing',
    '8': 'Canceled',
    '9': 'Deleted'
  };

  this.orderStatusCode = {
    '1': 'INITIAL',
    '2': 'Waiting for phishing check',
    '3': 'Cancelled - Not Issued',
    '4': 'Issue completed',
    '5': 'Cancelled - Issued',
    '6': 'Waiting for revocation',
    '7': 'Revoked'
  };

  this.auth = {
    'OrderID': config.globalsign.OrderId,
    'UserName': config.globalsign.GsignUser,
    'Password': config.globalsign.GsignPass
  };

  this.url = 'https://system.globalsign.com/kb/ws/v1/';

  soap.createClient(this.url + 'ServerSSLService?wsdl', function (err, client) {
    if (err) {
      return err;
    }
    self.client = client;
    self.emit('ready');
  });
};

sys.inherits(GSAPI, events.EventEmitter);


/**
 * Get Order Info
 * This function allows get orders information
 * @param {Function} callback
 */

GSAPI.prototype.getOrder = function (callback) {
  var params = {
    Request: {
      QueryRequestHeader: {
        AuthToken: this.auth
      },
      OrderQueryOption: {
        ReturnOrderOption: false,
        ReturnCertificateInfo: false,
        ReturnFulfillment: false,
        ReturnCACerts: false
      }
    }
  };
  soap.createClient('https://system.globalsign.com/bb/ws/GasQuery?wsdl', function (err, client) {
    if (err) {
      return err;
    }
    client.GetModifiedCloudOVOrders(params, function (err, result, raw, soapHeader) {
      if (err) {
        return callback({
          'status': '500',
          'output': {
            'result': 'error',
            'message': err
          }
        }, undefined);
      }
      callback(undefined, {
        'status': '200',
        'output': {
          'result': 'ok',
          'message': result
        }
      });
    });
  });
};


/**
 * Get Order Info
 * This function allows get order status
 * @param {Function} callback
 */

GSAPI.prototype.getStatus = function (callback) {
  var params = {
    Request: {
      QueryRequestHeader: {
        AuthToken: this.auth
      },
      OrderQueryOption: {
        OrderStatus: true,
        ReturnOrderOption: true,
        ReturnCertificateInfo: true,
        ReturnFulfillment: true,
        ReturnCACerts: true
      },
      OrderID: this.auth.OrderID
    }
  };
  soap.createClient('https://system.globalsign.com/bb/ws/GasQuery?wsdl', function (err, client) {
    if (err) {
      return err;
    }
    client.GetCloudOVOrderByOrderID(params, function (err, result, raw, soapHeader) {
      if (err) {
        return callback({
          'status': '500',
          'output': {
            'result': 'error',
            'message': err
          }
        }, undefined);
      }
      callback(undefined, {
        'status': '200',
        'output': {
          'result': 'ok',
          'message': result
        }
      });
    });
  });
};


/**
 * Get Approve List Request
 * @param {String} fqdn - is the CommonName from previous response (asslDecodeCSR)
 * @param {Function} callback
 */

GSAPI.prototype.getApproveList = function (san, fqdn, callback) {
  var params = {
    Request: {
      QueryRequestHeader: {
        AuthToken: this.auth
      },
      CloudOVSAN: [san],
      FQDN: fqdn,
      OrderID: this.auth.OrderID
    }
  };
  soap.createClient('https://system.globalsign.com/bb/ws/GasQuery?wsdl', function (err, client) {
    if (err) {
      return err;
    }
    client.GetCloudOVApproverList(params, function (err, result, raw, soapHeader) {
      if (err) {
        return callback({
          'status': '500',
          'output': {
            'result': 'error',
            'message': err
          }
        }, undefined);
      }
      callback(undefined, {
        'status': '200',
        'output': {
          'result': 'ok',
          'message': result
        }
      });
    });
  });
};

/**
 * Modify Operation Request
 * @param {String} san - ADDITION / DELETE / CANCEL operations for SAN
 * @param {Function} callback
 */

GSAPI.prototype.sanModifyOperation = function (san, operation, verification, email, wildcard, callback) {

  var entry = {
    CloudOVSAN: san,
    ModifyOperation: operation
  };

  if (verification === 'email') {
    entry.ApproverEmail = email;
  }

  if (wildcard === 'true') {
    entry.AdditionalWildcardOption = wildcard;
  }

  var params = {
    Request: {
      OrderRequestHeader: {
        AuthToken: this.auth
      },
      OrderRequestParameter: {
        OrderID: this.auth.OrderID,
        CloudSANEntries: {
          CloudSANEntry: []
        }
      }
    }
  };

  params.Request.OrderRequestParameter.CloudSANEntries.CloudSANEntry.push(entry);

  var sendRequest = function (err, result, raw, soapHeader) {
    if (err) {
      return callback({
        'status': '500',
        'output': {
          'result': 'error',
          'message': err
        }
      }, undefined);
    }
    callback(undefined, {
      'status': '200',
      'output': {
        'result': 'ok',
        'message': result
      }
    });
  };

  if (operation !== 'ADDITION' || verification === 'email') {
    soap.createClient('https://system.globalsign.com/bb/ws/GasOrder?wsdl', function (err, client) {
      if (err) {
        return err;
      }
      client.CloudOVSANOrder(params, sendRequest);
    });
  } else {
    if (verification === 'url') {
      soap.createClient('https://system.globalsign.com/bb/ws/GasOrder?wsdl', function (err, client) {
        if (err) {
          return err;
        }
        client.CloudOVSANOrderByURLVerification(params, sendRequest);
      });
    } else if (verification === 'dns') {
      soap.createClient('https://system.globalsign.com/bb/ws/GasOrder?wsdl', function (err, client) {
        if (err) {
          return err;
        }
        client.CloudOVSANOrderByDNSVerification(params, sendRequest);
      });
    } else {
      return 'Unknown verification type';
    }
  }

};

module.exports = GSAPI;
