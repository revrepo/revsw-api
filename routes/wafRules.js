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

/*jslint node: true */

'use strict';

var Joi = require('joi');

var wafRulesHandlers = require('../handlers/wafRules');

var routeModels = require('../lib/routeModels');

module.exports = [
  {
    method: 'GET',
    path: '/v1/waf_rules',
    config: {
      auth: {
        scope : ['user', 'admin', 'reseller', 'revadmin', 'apikey']
      },
      handler: wafRulesHandlers.listWAFRules,
      description: 'List all configured WAF Rules',
      tags: ['api'],
      validate:{
        query: {
          filters: Joi.object().keys({
            account_id: Joi.objectId().optional().trim().description('ID of a company'),
            visibility: Joi.string().optional().valid('public', 'hidden').description('WAF rule visibility scope'),
            rule_type: Joi.string().optional().valid('builtin','customer').description('WAF rule type')
          })
         .optional().description('Filters parameters')
        }
      },
      plugins: {
        'hapi-swagger': {
          responseMessages: routeModels.standardHTTPErrors
        }
      }
    }
  },

  {
    method: 'GET',
    path: '/v1/waf_rules/{waf_rule_id}',
    config: {
      auth:  {
        scope : ['user', 'admin', 'reseller', 'revadmin', 'apikey']
      },
      handler: wafRulesHandlers.getWAFRule,
      description: 'Get an WAF Rule',
      tags: ['api'],
      validate: {
        params: {
          waf_rule_id: Joi.objectId().required().description('WAF Rule ID')
        }
      },
      plugins: {
        'hapi-swagger': {
          responseMessages: routeModels.standardHTTPErrors
        }
      }
    }
  },

  {
    method: 'GET',
    path: '/v1/waf_rules/{waf_rule_id}/config_status',
    config: {
      auth: {
         scope : ['user', 'admin', 'reseller', 'revadmin', 'apikey']
      },
      handler: wafRulesHandlers.getWAFRuleStatus,
      description: 'Get the publishing status of an WAF Rule',
      tags: ['api'],
      validate: {
        params: {
          waf_rule_id: Joi.objectId().required().description('WAF Rule ID')
        }
      },
      plugins: {
        'hapi-swagger': {
          responseMessages: routeModels.standardHTTPErrors
        }
      }
    }
  },

  {
    method: 'POST',
    path: '/v1/waf_rules',
    config: {
      auth: {
        scope : ['user_rw', 'admin_rw', 'reseller_rw', 'revadmin_rw', 'apikey_rw']
      },
      handler: wafRulesHandlers.createWAFRule,
      description: 'Create a new WAF Rule object',
      tags: ['api'],
      validate: {
        payload : {
          account_id: Joi.objectId().required().description('Account ID of the account the WAF Rule should be created for'),
          rule_name: Joi.string().min(1).max(150).regex(routeModels.wafRuleNameRegex).required().description('WAF rule name'),
          rule_type: Joi.string().valid('builtin','customer').required().description('WAF rule type'),
          visibility: Joi.string().valid('public', 'hidden').required().description('WAF rule visibility scope'),
          comment: Joi.string().max(300).allow('').optional().description('Optional comment field'),
          rule_body: Joi.string().min(1).max(65000).required().description('WAF rule body')
       }
      },
      plugins: {
        'hapi-swagger': {
          responseMessages: routeModels.standardHTTPErrors
        }
      }
      /*, // TODO validate resplnse format
      response    : {
        schema : routeModels.statusModel
      }*/
    }
  },

  {
    method: 'PUT',
    path: '/v1/waf_rules/{waf_rule_id}',
    config: {
      auth: {
        scope : ['user_rw', 'admin_rw', 'reseller_rw', 'revadmin_rw', 'apikey_rw']
      },
      handler: wafRulesHandlers.updateWAFRule,
      description: 'Update an WAF Rule',
      tags: ['api'],
      validate: {
        params: {
          waf_rule_id: Joi.objectId().required().description('WAF Rule ID'),
        },
        query: {
          options: Joi.string().valid('verify_only', 'publish').optional()
        },
        payload: {
          account_id: Joi.objectId().required().description('Account ID of the account the domain should be created for'),
          rule_name: Joi.string().min(1).max(150).regex(routeModels.wafRuleNameRegex).required().description('WAF rule name'),
          rule_type: Joi.string().valid('builtin','customer').required().description('WAF rule type'),
          visibility: Joi.string().valid('public', 'hidden').required().description('WAF rule visibility scope'),
          comment: Joi.string().max(300).allow('').optional().description('Optional comment field'),
          rule_body: Joi.string().min(1).max(10000).required().description('WAF rule body')
        }
      },
      plugins: {
        'hapi-swagger': {
          responseMessages: routeModels.standardHTTPErrors
        }
      }
    }
  },

  {
    method: 'DELETE',
    path: '/v1/waf_rules/{waf_rule_id}',
    config: {
      auth: {
        scope : ['user_rw', 'admin_rw', 'reseller_rw', 'revadmin_rw', 'apikey_rw']
      },
      handler: wafRulesHandlers.deleteWAFRule,
      description: 'Delete an WAF Rule',
      tags: ['api'],
      validate: {
        params: {
          waf_rule_id: Joi.objectId().required().description('WAF Rule ID'),
        }
      },
      plugins: {
        'hapi-swagger': {
          responseMessages: routeModels.standardHTTPErrors
        }
      }
    }
  }
];
