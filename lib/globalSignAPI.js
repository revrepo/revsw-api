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
  config = require('config'),
  logger = require('revsw-logger')(config.log_config);


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

  this.GasOrder = config.globalsign.GasOrder;
  this.GasQuery = config.globalsign.GasQuery;
  this.ServerSSLService = config.globalsign.ServerSSLService;

  soap.createClient(this.ServerSSLService, function (err, client) {
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
  soap.createClient(this.GasQuery, function (err, client) {
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
  soap.createClient(this.GasQuery, function (err, client) {
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
  soap.createClient(this.GasQuery, function (err, client) {
    if (err) {
      return err;
    }
    logger.info('Calling GS to get a list of approval emails with params ' + JSON.stringify(params));
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
 * @param {String} san - SAN
 * @param {String} operation - ADDITION / DELETE / CANCEL operations for SAN
 * @param {String} verification - verification type
 * @param {String} email - verification email
 * @param {String} wildcard - wildcard for SSL name
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
    soap.createClient(this.GasOrder, function (err, client) {
      if (err) {
        return err;
      }
      client.CloudOVSANOrder(params, sendRequest);
      console.log(operation, JSON.stringify(params));
    });
  } else {
    if (verification === 'url') {
      soap.createClient(this.GasOrder, function (err, client) {
        if (err) {
          return err;
        }
        client.CloudOVSANOrderByURLVerification(params, sendRequest);
      });
    } else if (verification === 'dns') {
      soap.createClient(this.GasOrder, function (err, client) {
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

/**
 * Get Verify for SSL name
 * @param {String} SSL name
 * @param {Function} callback
 */

GSAPI.prototype.urlVerification = function (sslname, url, callback) {
  var params = {
    Request: {
      OrderRequestHeader: {
        AuthToken: this.auth
      },
      OrderID: this.auth.OrderID,
      ApproverURLEntries: {
        ApproverURLEntry: {
          CloudOVSAN: sslname,
          ApproverURL: url
        }
      }
    }
  };

  console.log(JSON.stringify(params));

  soap.createClient(this.GasOrder, function (err, client) {
    if (err) {
      return err;
    }
    client.URLVerification(params, function (err, result, raw, soapHeader) {
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

GSAPI.prototype.dnsVerification = function (sslname, dnsName, callback) {
  var params = {
    Request: {
      OrderRequestHeader: {
        AuthToken: this.auth
      },
      OrderID: this.auth.OrderID,
      ApproverDNSEntries: {
        ApproverDNSEntry: {
          CloudOVSAN: sslname,
          ApproverFQDN: dnsName
        }
      }
    }
  };

  console.log(JSON.stringify(params));

  soap.createClient(this.GasOrder, function (err, client) {
    if (err) {
      return err;
    }
    client.DNSVerification(params, function (err, result, raw, soapHeader) {
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

GSAPI.prototype.issueRequest = function (callback) {
  var params = {
    Request: {
      OrderRequestHeader: {
        AuthToken: this.auth
      },
      OrderID: this.auth.OrderID
    }
  };

  console.log(JSON.stringify(params));

  soap.createClient(this.GasOrder, function (err, client) {
    if (err) {
      return err;
    }
    client.IssueRequestForCloudOV(params, function (err, result, raw, soapHeader) {
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

module.exports = GSAPI;
