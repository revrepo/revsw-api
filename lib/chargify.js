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
'use strict';
var Joi = require('joi');
var request = require('superagent');
var config = require('config');
var logger = require('revsw-logger')(config.log_config);
var _ = require('lodash');
var moment = require('moment');
var User = require('../models/User');
var BillingPlan = require('../models/BillingPlan');

var chargifyConfig = config.get('chargify');
var password = chargifyConfig.password;
var domain = chargifyConfig.domain;
var api_key = chargifyConfig.api_key;
var Promise = require('bluebird');

Promise.promisifyAll(BillingPlan);

exports.Product = {

  // TODO add more info logging for all Chargify calls

  getByHandle: function(handle, cb) {
    request
      .get(domain + '/products/handle/' + handle)
      .auth(api_key, password)
      .type('application/json')
      .accept('application/json')
      .end(function(err, res) {
        if (err) {
          return cb(err, null);
        }
        return cb(null, res.body.product);
      });
  },

  getHostedPage: function(handle, cb) {
    this.getByHandle(handle, function(err, res) {
      if (err) {
        return cb(err, null);
      }
      var pages = res.public_signup_pages;
      if (pages && pages.length <= 0) {
        err = new Error('No hosted pages registered for this product');
        return cb(err, null);
      }
      return cb(null, pages[0]);
    });
  }
};

exports.Customer = {

  chargifyQuery: {
    per_page: 10000, /* up to 10k records */
    direction: 'desc'
  },

  getCustomerBySubscriptionId: function(subscriptionId, cb) {
    cb = cb || _.noop;
    request
      .get(domain + '/products/handle/' + subscriptionId)
      .auth(api_key, password)
      .type('application/json')
      .accept('application/json')
      .end(function(err, res) {
        if (err) {
          return cb(err, null);
        }
        return cb(null, res.body.customer);
      });
  },

  /**
   *
   * @param customerId
   * @param cb
   */
  getBillingPortalLink: function(customerId, cb) {
    cb = cb || _.noop;
    request
      .get(domain + '/portal/customers/' + customerId + '/management_link')
      .auth(api_key, password)
      .type('application/json')
      .accept('application/json')
      .end(function(err, res) {
        if (err) {
          return cb(err, null);
        }
        return cb(null, res.body);
      });
  },

  getTransactions: function(subscriptionId, cb) {
    cb = cb || _.noop;
    request
      .get(domain + '/subscriptions/' + subscriptionId + '/transactions')
      .query(this.chargifyQuery)
      .auth(api_key, password)
      .type('application/json')
      .accept('application/json')
      .end(function(err, res) {
        if (err) {
          return cb(err, null);
        }
        res.body = res.body.map(function(el) {
          return el.transaction;
        });
        return cb(null, res.body);
      });
  },

  getStatements: function(subscriptionId, cb) {
    cb = cb || _.noop;
    request
      .get(domain + '/subscriptions/' + subscriptionId + '/statements')
      .query(this.chargifyQuery)
      .auth(api_key, password)
      .type('application/json')
      .accept('application/json')
      .end(function(err, res) {
        if (err) {
          return cb(err, null);
        }
        res.body = res.body.map(function(el) {
          return el.statement;
        });
        return cb(null, res.body);
      });
  },

  getStatement: function(id, cb) {
    cb = cb || _.noop;
    request
      .get(domain + '/statements/' + id)
      .auth(api_key, password)
      .type('application/json')
      .accept('application/json')
      .end(function(err, res) {
        if (err) {
          return cb(err, null);
        }
        return cb(null, res.body.statement);
      });
  },

  getPdfStatement: function(id, cb) {
    cb = cb || _.noop;
    request
      .get(domain + '/statements/' + id + '.pdf')
      .auth(api_key, password)
      .type('application/json')
      .accept('application/pdf')
      .end(function(err, res) {
        if (err) {
          return cb(err, null);
        }
        var data = '';

        res.setEncoding('binary');
        res.on('data', function(chunk) {
          res.data += chunk;
        });
        res.on('end', function() {
          return cb(null, new Buffer(res.data, 'binary'));
        });
      });
  },

  getSubscriptionById: function(subscriptionId, cb) {
    cb = cb || _.noop;
    request
      .get(domain + '/subscriptions/' + subscriptionId)
      .auth(api_key, password)
      .type('application/json')
      .accept('application/json')
      .end(function(err, res) {
        if (err) {
          return cb(err, null);
        }
        return cb(null, res.body);
      });
  },
  /**
   * @name  createSubscription
   * @description
   *
   *  @see  https://docs.chargify.com/api-subscriptions
   *
   * @param  {[type]}   subscriptionId [description]
   * @param  {[type]}   data           [description]
   * @param  {Function} cb             [description]
   * @return {[type]}                  [description]
   */
  createSubscription: function(accountId, product_handle, cb) {
    cb = cb || _.noop;
    var data = {
      subscription: {
        customer_reference: accountId,
        product_handle: product_handle
      }
    };
    logger.info('createSubscription:: Calling Chargify to create subscription fow  ' + accountId +
      ' with data ' + JSON.stringify(data));
    request
      .post(domain + '/subscriptions')
      .send(data)
      .auth(api_key, password)
      .type('application/json')
      .accept('application/json')
      .end(function(err, res) {
        if (err) {
          logger.error('createSubscription:error' + JSON.stringify(err));
          return cb(err, null);
        }
        return cb(null, res.body);
      });
  },

  subscriptionMigrations: function(subscriptionId, data, cb) {
    cb = cb || _.noop;
    logger.info('subscriptionMigrations:: Calling Chargify to update subscription ID ' + subscriptionId +
      ' with data ' + JSON.stringify(data));
    request
      .post(domain + '/subscriptions/' + subscriptionId + '/migrations')
      .send(data)
      .auth(api_key, password)
      .type('application/json')
      .accept('application/json')
      .end(function(err, res) {
        if (err) {
          logger.error(JSON.stringify(err));
          return cb(err, null);
        }
        return cb(null, res.body);
      });
  },
  /**
   * @name subscriptionPreviewMigrations
   * @description
   *
   *
   * @see  https://docs.chargify.com/api-migrations
   *
   * @param  {String}   subscriptionId [description]
   * @param  {String}   data           product_id or product_handle
   * @param  {Function} cb
   * @return
   */
  subscriptionPreviewMigrations: function(subscriptionId, billing_plan_handle, cb) {
    cb = cb || _.noop;
    var data = {
      migration: {
        product_handle: billing_plan_handle
      }
    };
    logger.info('subscriptionPreviewMigrations:: Calling Chargify to preview migration for subscription ID ' + subscriptionId +
      ' with data ' + JSON.stringify(data));
    request
      .post(domain + '/subscriptions/' + subscriptionId + '/migrations/preview')
      .send(data)
      .auth(api_key, password)
      .type('application/json')
      .accept('application/json')
      .end(function(err, res) {
        if (err) {
          logger.error(JSON.stringify(err));
          return cb(err, null);
        }
        return cb(null, res.body);
      });
  },


  updateSubscription: function(subscriptionId, data, cb) {
    cb = cb || _.noop;
    logger.info('updateSubscription:: Calling Chargify to update subscription ID ' + subscriptionId +
      ' with data ' + JSON.stringify(data));
    request
      .put(domain + '/subscriptions/' + subscriptionId)
      .send(data)
      .auth(api_key, password)
      .type('application/json')
      .accept('application/json')
      .end(function(err, res) {
        if (err) {
          logger.error(JSON.stringify(err));
          return cb(err, null);
        }
        return cb(null, res.body);
      });
  },
  updatePaymentProfile: function(subscriptionId, account, cb) {
    cb = cb || _.noop;
    var info = account.billing_info;
    if (!info) {
      return cb('Missing billing info', null);
    }
    var data = {
      subscription: {
        payment_profile_attributes: {
          billing_address: info.address1 ? info.address1 : '',
          billing_address_2: info.address2 ? info.address2 : '',
          billing_country: info.country ? info.country : '',
          billing_state: info.state ? info.state : '',
          billing_city: info.city ? info.city : '',
          billing_zip: info.zipcode ? info.zipcode : ''
        }
      }
    };

    this.updateSubscription(subscriptionId, data, cb);
  },

  /**
   * @name  allocateResource
   * @description
   * Allocate resource using Chargify
   *
   * @param  {[type]}   subscriptionId [description]
   * @param  {[type]}   component_id   [description]
   * @param  {[type]}   allocation     [description]
   * @param  {Function} cb             [description]
   * @return {[type]}                  [description]
   */
  allocateResource: function(subscriptionId, component_id, allocation, cb) {
    cb = cb || _.noop;
    // NOTE: set default proration_upgrade_scheme
    if (!allocation.proration_upgrade_scheme) {
      allocation.proration_upgrade_scheme = 'no-prorate';
    }
    // NOTE: set default proration_downgrade_scheme
    if (!allocation.proration_downgrade_scheme) {
      allocation.proration_downgrade_scheme = 'no-prorate';
    }
    var data = {
      allocation: allocation
    };

    logger.info('allocateResource:: Calling Chargify to allocate resource for subscription ID ' + subscriptionId +
      ', component ID ' + component_id);
    request
      .post(domain + '/subscriptions/' + subscriptionId + '/components/' + component_id + '/allocations')
      .send(data)
      .auth(api_key, password)
      .type('application/json')
      .accept('application/json')
      .end(function(err, res) {
        if (err) {
          logger.error(JSON.stringify(err));
          return cb(err, null);
        }
        return cb(null, res.body);
      });
  },

  /**
   * Create multiple Allocations using Chargify
   *
   * @param subscriptionId
   * @param allocations - array[component_id,quantity,memo]
   * @param cb
   */
  multipleAllocatesResource: function(subscriptionId, allocations, cb) {
    cb = cb || _.noop;
    var data = {
      allocations: allocations
    };
    logger.info('multipleAllocations:: Calling Chargify to create multiple Allocations for subscription ID ' +
      subscriptionId + ' and Allocations ' + JSON.stringify(allocations)
    );
    request
      .post(domain + '/subscriptions/' + subscriptionId + '/allocations')
      .send(data)
      .auth(api_key, password)
      .type('application/json')
      .accept('application/json')
      .end(function(err, res) {
        if (err) {
          logger.error(JSON.stringify(err));
          return cb(err, null);
        }
        return cb(null, res.body);
      });
  },

  /**
   * Create Usage Chargify
   *
   * @param subscriptionId
   * @param usage - {quantity, memo}
   * @param cb
   */
  createUsageResource: function(subscriptionId, component_id, usage, cb) {
    cb = cb || _.noop;
    var data = {
      usage: usage
    };

    logger.info('createUsageResource::Calling Chargify to Create Usage resource for subscription ID ' + subscriptionId +
      ', component ID ' + component_id);

    request
      .post(domain + '/subscriptions/' + subscriptionId + '/components/' + component_id + '/usages')
      .send(data)
      .auth(api_key, password)
      .type('application/json')
      .accept('application/json')
      .end(function(err, res) {
        if (err) {
          logger.error('createUsageResource:error' + JSON.stringify(err));
          return cb(err, null);
        }
        return cb(null, res.body);
      });
  },

  /**
   * Synce Usage Chargify
   *
   * @param subscriptionId
   * @param usage - {quantity, memo}
   * @param cb
   */
  syncUsageResource: function(subscriptionId, component_id, usage, day, cb) {
    var createUsageResource = Promise.promisify(this.createUsageResource);
    cb = cb || _.noop;
    logger.info('syncUsageResource:: Sync data with Chargify for subscription ID ' + subscriptionId +
      ', component ID ' + component_id + ' for the day ' + day);
    // NOTE: not sync data if no data or usege.quantity == 0
    if (!usage) {
      logger.error('syncUsageResource: no data for send to billing system');
      return cb(new Error('No data for send to billing system'));
    }
    // get all for current  update day //since_date=2016-01-20&until_date=2016-01-21
    // ЗАПРОС З
    // NOTE: get all record for current billing month
    var query = {
      per_page: 10000,
      since_date: moment(day).startOf('month').format('YYYY-MM-DD'),
      until_date: moment(day).endOf('month').add(1, 'day').format('YYYY-MM-DD')
    };

    request
      .get(domain + '/subscriptions/' + subscriptionId + '/components/' + component_id + '/usages')
      .query(query)
      .auth(api_key, password)
      .type('application/json')
      .accept('application/json')
      .end(
        function(err, res) {
          if (err) {
            logger.error('syncUsageResource:error:' + JSON.stringify(err));
            return cb(err, null);
          }
          // NOTE: SUMM data by MEMO field value
          var quantity_summ = 0;
          _.forEach(res.body, function summBillingSystemData(item) {
            if (item.usage.memo === usage.memo) {
              var val = parseFloat(item.usage.quantity).toFixed(2);
              quantity_summ = parseFloat(quantity_summ) + parseFloat(val);
            }
          });
          var old_val = parseFloat(usage.quantity).toFixed(2);
          var new_val = parseFloat(old_val - quantity_summ).toFixed(2);

          // Set new correct value
          usage.quantity = new_val;
          // Prepare the data for send
          var data = {
            usage: usage
          };

          if (new_val === 0) {
            logger.info('syncUsageResource: Data already sync');
            return cb(null, {
              msg: 'Data already sync'
            });
          } else {
            // Call send data
            createUsageResource(subscriptionId, component_id, usage)
              .then(function(data) {
                return cb(null, data);
              })
              .catch(function(err) {
                return cb(err);
              });
          }
        });
  },

  /**
   * @name  changeProduct
   * @description
   *
   * Change Produc into Subscription using Migration
   *
   * @param  {[type]}   subscriptionId [description]
   * @param  {[type]}   handle         [description]
   * @param  {Function} cb             [description]
   * @return {[type]}                  [description]
   */
  changeProduct: function(subscriptionId, handle, cb) {
    var subscriptionMigrations = Promise.promisify(this.subscriptionMigrations);
    // var allocateResource = Promise.promisify(this.allocateResource);
    cb = cb || _.noop;
    if (!handle) {
      cb('No product handle provided', null);
    }
    var data = {
      migration: {
        product_handle: handle
      }
    };

    subscriptionMigrations(subscriptionId, data)
      .then(function() {
        return BillingPlan.findOneAsync({
          chargify_handle: handle
        });
      })
      // TODO: delete after testing change billing plan
      // .then(function (plan) {
      //   return Promise.map(plan.services, function (service) {
      //     return allocateResource(subscriptionId, service.chargify_id, service.included);
      //   });
      // })
      .then(function() {
        cb(null, true);
      })
      .catch(function(err) {
        cb(err, null);
      });
  },
  /**
   * @name  getSubscription
   * @description
   *
   * @param  {String}   subscriptionId
   * @param  {Function} cb
   * @return
   */
  getSubscription: function(subscriptionId, cb) {
    cb = cb || _.noop;

    logger.info('getSubscription:: Calling Chargify to get info about subscription ID ' + subscriptionId);
    request
      .get(domain + '/subscriptions/' + subscriptionId)
      .auth(api_key, password)
      .type('application/json')
      .accept('application/json')
      .end(function(err, res) {
        if (err) {
          return cb(err, null);
        }
        return cb(null, res.body);
      });
  },
  /**
   * @name  cancelSubscription
   * @description
   *
   * @param  {[type]}   subscriptionId       [description]
   * @param  {[type]}   cancellation_message [description]
   * @param  {Function} cb                   [description]
   * @return {[type]}                        [description]
   */
  cancelSubscription: function(subscriptionId, cancellation_message, cb) {
    cb = cb || _.noop;
    var data = {
      subscription: {
        cancellation_message: cancellation_message || 'Canceled via User API'
      }
    };
    logger.info('cancelSubscription:: Calling Chargify to cancel subscription ID ' + subscriptionId + ' with data ' + JSON.stringify(data));
    request
      .delete(domain + '/subscriptions/' + subscriptionId)
      .send(data)
      .auth(api_key, password)
      .type('application/json')
      .accept('application/json')
      .end(function(err, res) {
        if (err) {
          return cb(err, null);
        }
        return cb(null, res.body);
      });
  },

  create: function(account, cb) {
    cb = cb || _.noop;
    var info = {};
    if (account.use_contact_info_as_billing_info === true) {
      info = account;
    } else {
      info = account.billing_info;
    }
    var newCustomer = {
      reference: account.id,
      first_name: info.first_name,
      last_name: info.last_name,
      email: info.contact_email,
      organization: info.companyName,
      address: info.address1 || '',
      address_2: info.address2 || '',
      city: info.city || '',
      state: info.state || '',
      zip: info.zipcode || '',
      country: info.country || '',
      phone: info.phone_number || ''
    };
    // NOTE: We create Chargify Customer as our Account
    var data = {
      'customer': newCustomer
    };

    var schemaNewChargifyCustomer = {
      reference: Joi.objectId().required(),
      first_name: Joi.string().alphanum().required(),
      last_name: Joi.string().alphanum().required(),
      email: Joi.string().email().required(),
      organization: Joi.string().allow('').optional(),
      address: Joi.string().allow('').optional(),
      address_2: Joi.string().allow('').optional(),
      city: Joi.string().allow('').optional(),
      state: Joi.string().allow('').optional(),
      zip: Joi.string().allow('').optional(),
      country: Joi.string().allow('').optional(),
      phone: Joi.string().allow('').optional()
    };

    var errValidation = Joi.validate(newCustomer, schemaNewChargifyCustomer, {});

    if (errValidation.error) {
      return cb(errValidation, null);
    } else {
      request
        .post(domain + '/customers')
        .send(data)
        .auth(api_key, password)
        .type('application/json')
        .accept('application/json')
        .end(function(err, res) {
          if (err) {
            return cb(err, null);
          }
          return cb(null, res.body);
        });
    }
  },

  /**
   * @name  createBySubscription
   * @description
   *
   * @param  {[type]}   account        [description]
   * @param  {[type]}   product_handle [description]
   * @param  {Function} cb             [description]
   * @return {[type]}                  [description]
   */
  createBySubscription: function(account, product_handle, cb) {
    cb = cb || _.noop;
    var newCustomer = {
      reference: account.id,
      first_name: account.first_name,
      last_name: account.last_name,
      email: account.contact_email,
      organization: account.companyName,
      address: account.address1,
      address_2: account.address2,
      city: account.city,
      state: account.state,
      zip: account.zipcode,
      country: account.country,
      phone: account.phone_number
    };
    // NOTE: We create Chargify Customer as our Account and do Auto Subscription
    var data = {
      'subscription': {
        'product_handle': product_handle,
        'customer_attributes': newCustomer
      }
    };
    request
      .post(domain + '/subscriptions')
      .send(data)
      .auth(api_key, password)
      .type('application/json')
      .accept('application/json')
      .end(function(err, res) {
        if (err) {
          return cb(err, null);
        }
        return cb(null, res.body);
      });
  }
};
