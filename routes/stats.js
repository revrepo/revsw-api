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

/*jslint node: true */

'use strict';

var Joi = require('joi');

var getStats = require('../handlers/getStats');
var getTopObjects = require('../handlers/getTopObjects');
var getTopReports = require('../handlers/getTopReports');
var RTTReports = require('../handlers/getRTTReports');
var GBTReports = require('../handlers/getGBTReports');
var FBTReports = require('../handlers/getFBTReports');
var SDKReports = require('../handlers/getSDKReports');
var EdgeCacheReports = require('./../handlers/getEdgeCacheReports');

var routeModels = require('../lib/routeModels');

module.exports = [
  {
    method: 'GET',
    path: '/v1/stats/{domain_id}',
    config: {
      auth: {
        scope: [ 'user', 'admin', 'reseller', 'revadmin', 'apikey']
      },
      handler: getStats.getStats,
      description: 'Get traffic stats for a domain',
      tags: ['api'],
      plugins: {
        'hapi-swagger': {
          responseMessages: routeModels.standardHTTPErrors
        }
      },
      validate: {
        params: {
          domain_id: Joi.objectId().required().description('Domain ID')
        },
        query: {
          from_timestamp: Joi.string().description('Report period start timestamp'),
          to_timestamp: Joi.string().description('Report period end timestamp'),
          status_code: Joi.number().integer().min(100).max(600).description('HTTP status code to filter'),
          cache_code: Joi.string().valid( 'HIT', 'MISS' ).description('HTTP cache hit/miss status to filter'),
          request_status: Joi.string().valid( 'OK', 'ERROR' ).description('Request completion status to filter'),
          protocol: Joi.string().valid( 'HTTP', 'HTTPS' ).description('HTTP/HTTPS protocol to filter'),
          // http_protocol: Joi.string().valid( 'HTTP\/1.0', 'HTTP\/1.1' ).description('HTTP protocol version value to filter'),
          http_method: Joi.string().valid( 'GET', 'HEAD', 'POST', 'PUT', 'DELETE', 'TRACE', 'OPTIONS', 'CONNECT', 'PATCH' )
            .description('HTTP method value to filter'),
          quic: Joi.string().valid( 'QUIC', 'HTTP' ).description('Last mile protocol to filter'),
          country: Joi.string().length(2).uppercase().regex(/[A-Z]{2}/).description('Two-letters country code of end user location to filter'),
          os: Joi.string().description('OS name/version to filter'),
          device: Joi.string().description('Device name/version to filter'),
          browser: Joi.string().description('Browser name to filter')
        }
      }
    }
  },
  {
    method: 'GET',
    path: '/v1/stats/{domain_id}/activity',
    config: {
      auth: {
        scope: ['user', 'admin', 'reseller', 'revadmin', 'apikey']
      },
      handler: getStats.getStatsDomainActivity,
      description: 'Get all activity for for a domain',
      tags: ['api'],
      plugins: {
        'hapi-swagger': {
          responseMessages: routeModels.standardHTTPErrors
        }
      },
      validate: {
        params: {
          domain_id: Joi.objectId().required().description('Domain ID')
        },
        query: {
          from_timestamp: Joi.string().description('Report period start timestamp'),
          to_timestamp: Joi.string().description('Report period end timestamp')
        }
      }
    }
  },
  {
    method: 'GET',
    path: '/v1/stats/top_objects/{domain_id}',
    config: {
      auth: {
        scope: [ 'user', 'admin', 'reseller', 'revadmin', 'apikey' ]
      },
      handler: getTopObjects.getTopObjects,
      description: 'Get a list of top object requests for a domain',
      tags: ['api'],
      plugins: {
        'hapi-swagger': {
          responseMessages: routeModels.standardHTTPErrors
        }
      },
      validate: {
        params: {
          domain_id: Joi.objectId().required().description('Domain ID')
        },
        query: {
          from_timestamp: Joi.string().description('Report period start timestamp (defaults to one hour ago from now)'),
          to_timestamp: Joi.string().description('Report period end timestamp (defaults to now)'),
          count: Joi.number().integer().min(1).max(250).description('Number of top objects to report (default to 30)'),
          status_code: Joi.number().integer().min(100).max(600).description('HTTP status code to filter'),
          cache_code: Joi.string().valid( 'HIT', 'MISS' ).description('HTTP cache hit/miss status to filter'),
          request_status: Joi.string().valid( 'OK', 'ERROR' ).description('Request completion status to filter'),
          protocol: Joi.string().valid( 'HTTP', 'HTTPS' ).description('HTTP/HTTPS protocol to filter'),
          // http_protocol: Joi.string().valid( 'HTTP\/1.0', 'HTTP\/1.1' ).description('HTTP protocol version value to filter'),
          http_method: Joi.string().valid( 'GET', 'HEAD', 'POST', 'PUT', 'DELETE', 'TRACE', 'OPTIONS', 'CONNECT', 'PATCH' )
            .description('HTTP method value to filter'),
          quic: Joi.string().valid( 'QUIC', 'HTTP' ).description('Last mile protocol to filter'),
          http2: Joi.string().valid( 'h2', 'h2c' ).description('HTTP2 protocol type to filter'),
          country: Joi.string().length(2).uppercase().regex(/[A-Z]{2}/).description('Two-letters country code of end user location to filter'),
          os: Joi.string().description('OS name/version to filter'),
          device: Joi.string().description('Device name/version to filter'),
          browser: Joi.string().description('Browser name to filter')
        }
      }
    }
  },

  {
    method: 'GET',
    path: '/v1/stats/slowest_fbt_objects/{domain_id}',
    config: {
      auth: {
        scope: [ 'user', 'admin', 'reseller', 'revadmin', 'apikey' ]
      },
      handler: getTopObjects.getSlowestFBTObjects,
      description: 'Get a list of object requests with slowest FBT',
      tags: ['api'],
      plugins: {
        'hapi-swagger': {
          responseMessages: routeModels.standardHTTPErrors
        }
      },
      validate: {
        params: {
          domain_id: Joi.objectId().required().description('Domain ID')
        },
        query: {
          from_timestamp: Joi.string().description('Report period start timestamp (defaults to one hour ago from now)'),
          to_timestamp: Joi.string().description('Report period end timestamp (defaults to now)'),
          count: Joi.number().integer().min(1).max(250).description('Number of top objects to report (default to 30)'),
          country: Joi.string().length(2).uppercase().regex(/[A-Z]{2}/).description('Two-letters country code of end user location to filter'),
          os: Joi.string().description('OS name/version to filter'),
          device: Joi.string().description('Device name/version to filter'),
          browser: Joi.string().description('Browser name to filter')
        }
      }
    }
  },

  {
    method: 'GET',
    path: '/v1/stats/slowest_download_objects/{domain_id}',
    config: {
      auth: {
        scope: [ 'user', 'admin', 'reseller', 'revadmin', 'apikey' ]
      },
      handler: getTopObjects.getSlowestDownloadObjects,
      description: 'Get a list of object requests with slowest download time',
      tags: ['api'],
      plugins: {
        'hapi-swagger': {
          responseMessages: routeModels.standardHTTPErrors
        }
      },
      validate: {
        params: {
          domain_id: Joi.objectId().required().description('Domain ID')
        },
        query: {
          from_timestamp: Joi.string().description('Report period start timestamp (defaults to one hour ago from now)'),
          to_timestamp: Joi.string().description('Report period end timestamp (defaults to now)'),
          count: Joi.number().integer().min(1).max(250).description('Number of top objects to report (default to 30)'),
          country: Joi.string().length(2).uppercase().regex(/[A-Z]{2}/).description('Two-letters country code of end user location to filter'),
          os: Joi.string().description('OS name/version to filter'),
          device: Joi.string().description('Device name/version to filter'),
          browser: Joi.string().description('Browser name to filter')
        }
      }
    }
  },

  {
    method: 'GET',
    path: '/v1/stats/top/{domain_id}',
    config: {
      auth: {
        scope: [ 'user', 'admin', 'reseller', 'revadmin', 'apikey' ]
      },
      handler: getTopReports.getTopReports,
      description: 'Get a list of top traffic properties for a domain',
      tags: ['api'],
      plugins: {
        'hapi-swagger': {
          responseMessages: routeModels.standardHTTPErrors
        }
      },
      validate: {
        params: {
          domain_id: Joi.objectId().required().description('Domain ID')
        },
        query: {
          from_timestamp: Joi.string().description('Report period start timestamp (defaults to one hour ago from now)'),
          to_timestamp: Joi.string().description('Report period end timestamp (defaults to now)'),
          count: Joi.number().integer().min(1).max(250).description('Number of entries to report (default to 30)'),
          report_type: Joi.string().required().valid ( 'referer', 'status_code', 'cache_status', 'content_type', 'protocol', 'request_status',
            'http_protocol', 'http_method', 'content_encoding', 'os', 'device', 'country', 'QUIC', 'http2', 'top5xx', 'browser',
            'ie_format_changes', 'ie_resolution_changes').description('Type of requested report (defaults to "referer")'),
          country: Joi.string().length(2).uppercase().regex(/[A-Z]{2}/).description('Two-letters country code of end user location to filter'),
          os: Joi.string().description('OS name/version to filter'),
          device: Joi.string().description('Device name/version to filter'),
          browser: Joi.string().description('Browser name to filter')
        }
      }
    }
  },

  {
    method: 'GET',
    path: '/v1/stats/top_lists/{domain_id}',
    config: {
      auth: {
        scope: [ 'user', 'admin', 'reseller', 'revadmin', 'apikey' ]
      },
      handler: getTopReports.getTopLists,
      description: 'Get all possible values of [country, os, device, browser, statuses(optional)] for the domain and timespan',
      tags: ['api'],
      plugins: {
        'hapi-swagger': {
          responseMessages: routeModels.standardHTTPErrors
        }
      },
      validate: {
        params: {
          domain_id: Joi.objectId().required().description('Domain ID')
        },
        query: {
          from_timestamp: Joi.string().description('Report period start timestamp (defaults to one hour ago from now)'),
          to_timestamp: Joi.string().description('Report period end timestamp (defaults to now)'),
          status_codes: Joi.boolean().default(false).description('add list of status codes, default false'),
        }
      }
    }
  },

  {
    method: 'GET',
    path: '/v1/stats/lastmile_rtt/{domain_id}',
    config: {
      auth: {
        scope: [ 'user', 'admin', 'reseller', 'revadmin', 'apikey' ]
      },
      handler: RTTReports.getRTTReports,
      description: 'Get RTT stats for a domain',
      tags: ['api'],
      plugins: {
        'hapi-swagger': {
          responseMessages: routeModels.standardHTTPErrors
        }
      },
      validate: {
        params: {
          domain_id: Joi.objectId().required().description('Domain ID')
        },
        query: {
          from_timestamp: Joi.string().description('Report period start timestamp (defaults to one hour ago from now)'),
          to_timestamp: Joi.string().description('Report period end timestamp (defaults to now)'),
          count: Joi.number().integer().min(1).max(250).description('Number of entries to report (default to 30)'),
          report_type: Joi.string().valid ( 'country', 'device', 'os' ).description('Type of requested report (defaults to "country")'),
        }
      }
    }
  },

  {
    method: 'GET',
    path: '/v1/stats/lastmile_rtt_histo/{domain_id}',
    config: {
      auth: {
        scope: [ 'user', 'admin', 'reseller', 'revadmin', 'apikey' ]
      },
      handler: RTTReports.getRTTStats,
      description: 'Get RTT stats for a domain',
      tags: ['api'],
      plugins: {
        'hapi-swagger': {
          responseMessages: routeModels.standardHTTPErrors
        }
      },
      validate: {
        params: {
          domain_id: Joi.objectId().required().description('Domain ID')
        },
        query: {
          from_timestamp: Joi.string().description('Report period start timestamp (defaults to one hour ago from now)'),
          to_timestamp: Joi.string().description('Report period end timestamp (defaults to now)'),
          country: Joi.string().length(2).uppercase().regex(/[A-Z]{2}/).description('Two-letters country code of end user location to filter'),
          os: Joi.string().description('OS name/version to filter'),
          device: Joi.string().description('Device name/version to filter'),
          browser: Joi.string().description('Browser name to filter')
        }
      }
    }
  },

  {
    method: 'GET',
    path: '/v1/stats/gbt/{domain_id}',
    config: {
      auth: {
        scope: [ 'user', 'admin', 'reseller', 'revadmin', 'apikey' ]
      },
      handler: GBTReports.getGBTReports,
      description: 'Get GBT stats for a domain',
      tags: ['api'],
      plugins: {
        'hapi-swagger': {
          responseMessages: routeModels.standardHTTPErrors
        }
      },
      validate: {
        params: {
          domain_id: Joi.objectId().required().description('Domain ID')
        },
        query: {
          from_timestamp: Joi.string().description('Report period start timestamp (defaults to one hour ago from now)'),
          to_timestamp: Joi.string().description('Report period end timestamp (defaults to now)'),
          count: Joi.number().integer().min(1).max(250).description('Number of entries to report (default to 30)'),
          report_type: Joi.string().valid ( 'country', 'device', 'os' ).description('Type of requested report (defaults to "country")'),
        }
      }
    }
  },

  {
    method: 'GET',
    path: '/v1/stats/fbt/average/{domain_id}',
    config: {
      auth: {
        scope: [ 'user', 'admin', 'reseller', 'revadmin', 'apikey' ]
      },
      handler: FBTReports.getFBTAverage,
      description: 'Get FBT average stats for a domain',
      tags: ['api'],
      plugins: {
        'hapi-swagger': {
          responseMessages: routeModels.standardHTTPErrors
        }
      },
      validate: {
        params: {
          domain_id: Joi.objectId().required().description('Domain ID')
        },
        query: {
          from_timestamp: Joi.string().description('Report period start timestamp (defaults to one hour ago from now)'),
          to_timestamp: Joi.string().description('Report period end timestamp (defaults to now)'),
          country: Joi.string().length(2).uppercase().regex(/[A-Z]{2}/).description('Two-letters country code of end user location to filter'),
          os: Joi.string().description('OS name/version to filter'),
          device: Joi.string().description('Device name/version to filter'),
          browser: Joi.string().description('Browser name to filter')
        }
      }
    }
  },

  {
    method: 'GET',
    path: '/v1/stats/fbt/distribution/{domain_id}',
    config: {
      auth: {
        scope: [ 'user', 'admin', 'reseller', 'revadmin', 'apikey' ]
      },
      handler: FBTReports.getFBTDistribution,
      description: 'Get FBT distribution for a domain',
      tags: ['api'],
      plugins: {
        'hapi-swagger': {
          responseMessages: routeModels.standardHTTPErrors
        }
      },
      validate: {
        params: {
          domain_id: Joi.objectId().required().description('Domain ID')
        },
        query: {
          from_timestamp: Joi.string().description('Report period start timestamp (defaults to one hour ago from now)'),
          to_timestamp: Joi.string().description('Report period end timestamp (defaults to now)'),
          country: Joi.string().length(2).uppercase().regex(/[A-Z]{2}/).description('Two-letters country code of end user location to filter'),
          os: Joi.string().description('OS name/version to filter'),
          device: Joi.string().description('Device name/version to filter'),
          browser: Joi.string().description('Browser name to filter'),
          interval_ms: Joi.number().integer().description('Distribution sampling size, step, ms'),
          limit_ms: Joi.number().integer().description('Maximal value, ms'),
        }
      }
    }
  },

  {
    method: 'GET',
    path: '/v1/stats/fbt/heatmap/{domain_id}',
    config: {
      auth: {
        scope: [ 'user', 'admin', 'reseller', 'revadmin', 'apikey' ]
      },
      handler: FBTReports.getFBTHeatmap,
      description: 'Get FBT for a domain grouped by countries',
      tags: ['api'],
      plugins: {
        'hapi-swagger': {
          responseMessages: routeModels.standardHTTPErrors
        }
      },
      validate: {
        params: {
          domain_id: Joi.objectId().required().description('Domain ID')
        },
        query: {
          from_timestamp: Joi.string().description('Report period start timestamp (defaults to one hour ago from now)'),
          to_timestamp: Joi.string().description('Report period end timestamp (defaults to now)'),
          count: Joi.number().integer().min(1).max(250).description('Number of entries to report (default to 30)'),
        }
      }
    }
  },

  {
    method: 'GET',
    path: '/v1/stats/mobile_desktop/{domain_id}',
    config: {
      auth: {
        scope: [ 'user', 'admin', 'reseller', 'revadmin', 'apikey']
      },
      handler: getStats.getMobileDesktopDistribution,
      description: 'Get mobile/desktop distribution for a domain',
      tags: ['api'],
      plugins: {
        'hapi-swagger': {
          responseMessages: routeModels.standardHTTPErrors
        }
      },
      validate: {
        params: {
          domain_id: Joi.objectId().required().description('Domain ID')
        },
        query: {
          from_timestamp: Joi.string().description('Report period start timestamp'),
          to_timestamp: Joi.string().description('Report period end timestamp'),
          status_code: Joi.number().integer().min(100).max(600).description('HTTP status code to filter'),
          cache_code: Joi.string().valid( 'HIT', 'MISS' ).description('HTTP cache hit/miss status to filter'),
          request_status: Joi.string().valid( 'OK', 'ERROR' ).description('Request completion status to filter'),
          protocol: Joi.string().valid( 'HTTP', 'HTTPS' ).description('HTTP/HTTPS protocol to filter'),
          http_method: Joi.string().valid( 'GET', 'HEAD', 'POST', 'PUT', 'DELETE', 'TRACE', 'OPTIONS', 'CONNECT', 'PATCH' )
            .description('HTTP method value to filter'),
          quic: Joi.string().valid( 'QUIC', 'HTTP' ).description('Last mile protocol to filter'),
          country: Joi.string().length(2).uppercase().regex(/[A-Z]{2}/).description('Two-letters country code of end user location to filter')
        }
      }
    }
  },

  {
    method: 'GET',
    path: '/v1/stats/sdk/app/{app_id}',
    config: {
      auth: {
        scope: [ 'user', 'admin', 'reseller', 'revadmin', 'apikey' ]
      },
      handler: SDKReports.getAppReport,
      description: 'Get SDK stats for the application',
      tags: ['api'],
      plugins: {
        'hapi-swagger': {
          responseMessages: routeModels.standardHTTPErrors
        }
      },
      validate: {
        params: {
          app_id: Joi.objectId().required().description('Application ID')
        },
        query: {
          from_timestamp: Joi.string().description('Report period start timestamp (defaults to 24 hours ago from now)'),
          to_timestamp: Joi.string().description('Report period end timestamp (defaults to now)'),
          report_type: Joi.string().valid ( 'hits', 'devices' ).description('Type of requested report (defaults to "hits")')
        }
      }
    }
  },

  {
    method: 'GET',
    path: '/v1/stats/sdk/account/{account_id}',
    config: {
      auth: {
        scope: [ 'user', 'admin', 'reseller', 'revadmin', 'apikey' ]
      },
      handler: SDKReports.getAccountReport,
      description: 'Get SDK stats for the account',
      tags: ['api'],
      plugins: {
        'hapi-swagger': {
          responseMessages: routeModels.standardHTTPErrors
        }
      },
      validate: {
        params: {
          account_id: Joi.objectId().required().description('Account(Customer) ID')
        },
        query: {
          from_timestamp: Joi.string().description('Report period start timestamp (defaults to 24 hours ago from now)'),
          to_timestamp: Joi.string().description('Report period end timestamp (defaults to now)'),
          report_type: Joi.string().valid ( 'hits', 'devices' ).description('Type of requested report (defaults to "hits")')
        }
      }
    }
  },

  {
    method: 'GET',
    path: '/v1/stats/sdk/dirs',
    config: {
      auth: {
        scope: [ 'user', 'admin', 'reseller', 'revadmin', 'apikey' ]
      },
      handler: SDKReports.getDirs,
      description: 'Get SDK lists of possible values for countries, oses, devices and operators for the further filtering',
      tags: ['api'],
      plugins: {
        'hapi-swagger': {
          responseMessages: routeModels.standardHTTPErrors
        }
      },
      validate: {
        query: {
          account_id: Joi.objectId().description('Account ID, optional'),
          app_id: Joi.objectId().description('Application ID, optional, either Account ID or App ID should be provided'),
          from_timestamp: Joi.string().description('Report period start timestamp (defaults to 24 hours ago from now)'),
          to_timestamp: Joi.string().description('Report period end timestamp (defaults to now)')
        }
      }
    }
  },

  {
    method: 'GET',
    path: '/v1/stats/sdk/flow',
    config: {
      auth: {
        scope: [ 'user', 'admin', 'reseller', 'revadmin', 'apikey' ]
      },
      handler: SDKReports.getFlowReport,
      description: 'Get SDK data flow for an account and optionally application',
      tags: ['api'],
      plugins: {
        'hapi-swagger': {
          responseMessages: routeModels.standardHTTPErrors
        }
      },
      validate: {
        query: {
          account_id: Joi.objectId().description('Account ID, optional'),
          app_id: Joi.objectId().description('Application ID, optional, either Account ID or App ID should be provided'),
          from_timestamp: Joi.string().description('Report period start timestamp (defaults to 24 hours ago from now)'),
          to_timestamp: Joi.string().description('Report period end timestamp (defaults to now)'),
          device: Joi.string().description('Device name/version to filter'),
          os: Joi.string().description('OS name/version to filter'),
          country: Joi.string().length(2).uppercase().regex(/[A-Z]{2}/).description('Two-letters country code of end user location to filter'),
          operator: Joi.string().description('Operator to filter'),
          network: Joi.string().valid( 'Cellular', 'WiFi' ).description('Network type to filter')
        }
      }
    }
  },

  {
    method: 'GET',
    path: '/v1/stats/sdk/agg_flow',
    config: {
      auth: {
        scope: [ 'user', 'admin', 'reseller', 'revadmin', 'apikey' ]
      },
      handler: SDKReports.getAggFlowReport,
      description: 'Get SDK data flow for an account and optionally application, grouped by the given type',
      tags: ['api'],
      plugins: {
        'hapi-swagger': {
          responseMessages: routeModels.standardHTTPErrors
        }
      },
      validate: {
        query: {
          account_id: Joi.objectId().description('Account ID, optional'),
          app_id: Joi.objectId().description('Application ID, optional, either Account ID or App ID should be provided'),
          from_timestamp: Joi.string().description('Report period start timestamp (defaults to 24 hours ago from now)'),
          to_timestamp: Joi.string().description('Report period end timestamp (defaults to now)'),
          report_type: Joi.string().required().valid ( 'status_code', 'destination', 'transport', 'status', 'cache' )
            .description('Type of requested report, required'),
          device: Joi.string().description('Device name/version to filter'),
          os: Joi.string().description('OS name/version to filter'),
          country: Joi.string().length(2).uppercase().regex(/[A-Z]{2}/).description('Two-letters country code of end user location to filter'),
          operator: Joi.string().description('Operator to filter'),
          network: Joi.string().valid( 'Cellular', 'WiFi' ).description('Network type to filter')
        }
      }
    }
  },

  {
    method: 'GET',
    path: '/v1/stats/sdk/top_requests',
    config: {
      auth: {
        scope: [ 'user', 'admin', 'reseller', 'revadmin', 'apikey' ]
      },
      handler: SDKReports.getTopRequests,
      description: 'Get hits amount for top traffic properties for an account and optionally application',
      tags: ['api'],
      plugins: {
        'hapi-swagger': {
          responseMessages: routeModels.standardHTTPErrors
        }
      },
      validate: {
        query: {
          account_id: Joi.objectId().description('Account ID, optional'),
          app_id: Joi.objectId().description('Application ID, optional, either Account ID or App ID should be provided'),
          from_timestamp: Joi.string().description('Report period start timestamp (defaults to one hour ago from now)'),
          to_timestamp: Joi.string().description('Report period end timestamp (defaults to now)'),
          count: Joi.number().integer().min(1).max(250).description('Number of entries to report (default to 30)'),
          report_type: Joi.string().required().valid ( 'country', 'os', 'device', 'operator', 'network' )
            .description('Type of requested report, required')
        }
      }
    }
  },

  {
    method: 'GET',
    path: '/v1/stats/sdk/top_users',
    config: {
      auth: {
        scope: [ 'user', 'admin', 'reseller', 'revadmin', 'apikey' ]
      },
      handler: SDKReports.getTopUsers,
      description: 'Get users amount for top traffic properties for an account and optionally application',
      tags: ['api'],
      plugins: {
        'hapi-swagger': {
          responseMessages: routeModels.standardHTTPErrors
        }
      },
      validate: {
        query: {
          account_id: Joi.objectId().description('Account ID, optional'),
          app_id: Joi.objectId().description('Application ID, optional, either Account ID or App ID should be provided'),
          from_timestamp: Joi.string().description('Report period start timestamp (defaults to one hour ago from now)'),
          to_timestamp: Joi.string().description('Report period end timestamp (defaults to now)'),
          count: Joi.number().integer().min(1).max(250).description('Number of entries to report (default to 30)'),
          report_type: Joi.string().required().valid ( 'country', 'os', 'device', 'operator', 'network' )
            .description('Type of requested report, required')
        }
      }
    }
  },

  {
    method: 'GET',
    path: '/v1/stats/sdk/top_gbt',
    config: {
      auth: {
        scope: [ 'user', 'admin', 'reseller', 'revadmin', 'apikey' ]
      },
      handler: SDKReports.getTopGBT,
      description: 'Get data sent for top traffic properties for an account and optionally application',
      tags: ['api'],
      plugins: {
        'hapi-swagger': {
          responseMessages: routeModels.standardHTTPErrors
        }
      },
      validate: {
        query: {
          account_id: Joi.objectId().description('Account ID, optional'),
          app_id: Joi.objectId().description('Application ID, optional, either Account ID or App ID should be provided'),
          from_timestamp: Joi.string().description('Report period start timestamp (defaults to one hour ago from now)'),
          to_timestamp: Joi.string().description('Report period end timestamp (defaults to now)'),
          count: Joi.number().integer().min(1).max(250).description('Number of entries to report (default to 30)'),
          report_type: Joi.string().required().valid ( 'country', 'os', 'device', 'operator', 'network' )
            .description('Type of requested report, required')
        }
      }
    }
  },

  {
    method: 'GET',
    path: '/v1/stats/sdk/distributions',
    config: {
      auth: {
        scope: [ 'user', 'admin', 'reseller', 'revadmin', 'apikey' ]
      },
      handler: SDKReports.getDistributions,
      description: 'Get distributions of top traffic properties for an account and optionally application',
      tags: ['api'],
      plugins: {
        'hapi-swagger': {
          responseMessages: routeModels.standardHTTPErrors
        }
      },
      validate: {
        query: {
          account_id: Joi.objectId().description('Account ID, optional'),
          app_id: Joi.objectId().description('Application ID, optional, either Account ID or App ID should be provided'),
          from_timestamp: Joi.string().description('Report period start timestamp (defaults to one hour ago from now)'),
          to_timestamp: Joi.string().description('Report period end timestamp (defaults to now)'),
          count: Joi.number().integer().min(1).max(250).description('Number of entries to report (optional, default to 30)'),
          report_type: Joi.string().required().valid ( 'destination', 'transport', 'status', 'cache', 'domain', 'status_code' )
            .description('Type of requested report (defaults to "destination")')
        }
      }
    }
  },

  {
    method: 'GET',
    path: '/v1/stats/sdk/top_objects',
    config: {
      auth: {
        scope: [ 'user', 'admin', 'reseller', 'revadmin', 'apikey' ]
      },
      handler: SDKReports.getTopObjects,
      description: 'Get list of the top SDK objects for an account and optionally application',
      tags: ['api'],
      plugins: {
        'hapi-swagger': {
          responseMessages: routeModels.standardHTTPErrors
        }
      },
      validate: {
        query: {
          account_id: Joi.objectId().description('Account ID, optional'),
          app_id: Joi.objectId().description('Application ID, optional, either Account ID or App ID should be provided'),
          from_timestamp: Joi.string().description('Report period start timestamp (defaults to one hour ago from now)'),
          to_timestamp: Joi.string().description('Report period end timestamp (defaults to now)'),
          report_type: Joi.string().valid ( 'failed', 'cache_missed', 'not_found' )
            .description('Type of requested report'),
          count: Joi.number().integer().min(1).max(250).description('Number of entries to report (optional, default to 30)'),
          device: Joi.string().description('Device name/version to filter'),
          os: Joi.string().description('OS name/version to filter'),
          country: Joi.string().length(2).uppercase().regex(/[A-Z]{2}/).description('Two-letters country code of end user location to filter'),
          operator: Joi.string().description('Operator to filter'),
          network: Joi.string().valid( 'Cellular', 'WiFi' ).description('Network type to filter')
        }
      }
    }
  },

  {
    method: 'GET',
    path: '/v1/stats/sdk/top_objects/slowest',
    config: {
      auth: {
        scope: [ 'user', 'admin', 'reseller', 'revadmin', 'apikey' ]
      },
      handler: SDKReports.getTopObjectsSlowest,
      description: 'Get list of the slowest SDK objects for an account and optionally application',
      tags: ['api'],
      plugins: {
        'hapi-swagger': {
          responseMessages: routeModels.standardHTTPErrors
        }
      },
      validate: {
        query: {
          account_id: Joi.objectId().description('Account ID, optional'),
          app_id: Joi.objectId().description('Application ID, optional, either Account ID or App ID should be provided'),
          from_timestamp: Joi.string().description('Report period start timestamp (defaults to one hour ago from now)'),
          to_timestamp: Joi.string().description('Report period end timestamp (defaults to now)'),
          count: Joi.number().integer().min(1).max(250).description('Number of entries to report (optional, default to 30)'),
          report_type: Joi.string().required().valid ( 'full', 'first_byte' )
            .description('Type of requested report, required'),
          device: Joi.string().description('Device name/version to filter'),
          os: Joi.string().description('OS name/version to filter'),
          country: Joi.string().length(2).uppercase().regex(/[A-Z]{2}/).description('Two-letters country code of end user location to filter'),
          operator: Joi.string().description('Operator to filter'),
          network: Joi.string().valid( 'Cellular', 'WiFi' ).description('Network type to filter')
        }
      }
    }
  },

  {
    method: 'GET',
    path: '/v1/stats/sdk/top_objects/5xx',
    config: {
      auth: {
        scope: [ 'user', 'admin', 'reseller', 'revadmin', 'apikey' ]
      },
      handler: SDKReports.getTopObjects5xx,
      description: 'Get list of the SDK objects with 5XX codes, for an account and optionally application',
      tags: ['api'],
      plugins: {
        'hapi-swagger': {
          responseMessages: routeModels.standardHTTPErrors
        }
      },
      validate: {
        query: {
          account_id: Joi.objectId().description('Account ID, optional'),
          app_id: Joi.objectId().description('Application ID, optional, either Account ID or App ID should be provided'),
          from_timestamp: Joi.string().description('Report period start timestamp (defaults to one hour ago from now)'),
          to_timestamp: Joi.string().description('Report period end timestamp (defaults to now)'),
          count: Joi.number().integer().min(1).max(250).description('Number of entries to report (optional, default to 30)'),
          device: Joi.string().description('Device name/version to filter'),
          os: Joi.string().description('OS name/version to filter'),
          country: Joi.string().length(2).uppercase().regex(/[A-Z]{2}/).description('Two-letters country code of end user location to filter'),
          operator: Joi.string().description('Operator to filter'),
          network: Joi.string().valid( 'Cellular', 'WiFi' ).description('Network type to filter')
        }
      }
    }
  },

  {
    method: 'GET',
    path: '/v1/stats/sdk/ab/fbt',
    config: {
      auth: {
        scope: [ 'user', 'admin', 'reseller', 'revadmin', 'apikey' ]
      },
      handler: SDKReports.getAB4FBTAverage,
      description: 'Get SDK FBT min, max, average histograms, separated by destination, for an account and optionally application',
      tags: ['api'],
      plugins: {
        'hapi-swagger': {
          responseMessages: routeModels.standardHTTPErrors
        }
      },
      validate: {
        query: {
          account_id: Joi.objectId().description('Account ID, optional'),
          app_id: Joi.objectId().description('Application ID, optional, either Account ID or App ID should be provided'),
          from_timestamp: Joi.string().description('Report period start timestamp (defaults to 24 hours ago from now)'),
          to_timestamp: Joi.string().description('Report period end timestamp (defaults to now)'),
          device: Joi.string().description('Device name/version to filter'),
          os: Joi.string().description('OS name/version to filter'),
          country: Joi.string().length(2).uppercase().regex(/[A-Z]{2}/).description('Two-letters country code of end user location to filter'),
          operator: Joi.string().description('Operator to filter'),
          network: Joi.string().valid( 'Cellular', 'WiFi' ).description('Network type to filter')
        }
      }
    }
  },

  {
    method: 'GET',
    path: '/v1/stats/sdk/ab/fbt_distribution',
    config: {
      auth: {
        scope: [ 'user', 'admin', 'reseller', 'revadmin', 'apikey' ]
      },
      handler: SDKReports.getAB4FBTDistribution,
      description: 'Get SDK FBT value distribution histogram, separated by destination, for an account and optionally application',
      tags: ['api'],
      plugins: {
        'hapi-swagger': {
          responseMessages: routeModels.standardHTTPErrors
        }
      },
      validate: {
        query: {
          account_id: Joi.objectId().description('Account ID, optional'),
          app_id: Joi.objectId().description('Application ID, optional, either Account ID or App ID should be provided'),
          from_timestamp: Joi.string().description('Report period start timestamp (defaults to 24 hours ago from now)'),
          to_timestamp: Joi.string().description('Report period end timestamp (defaults to now)'),
          interval_ms: Joi.number().integer().description('Distribution sampling size, step, 100 ms default'),
          limit_ms: Joi.number().integer().description('Maximal value, 10000ms default'),
          device: Joi.string().description('Device name/version to filter'),
          os: Joi.string().description('OS name/version to filter'),
          country: Joi.string().length(2).uppercase().regex(/[A-Z]{2}/).description('Two-letters country code of end user location to filter'),
          operator: Joi.string().description('Operator to filter'),
          network: Joi.string().valid( 'Cellular', 'WiFi' ).description('Network type to filter')
        }
      }
    }
  },

  {
    method: 'GET',
    path: '/v1/stats/sdk/ab/errors',
    config: {
      auth: {
        scope: [ 'user', 'admin', 'reseller', 'revadmin', 'apikey' ]
      },
      handler: SDKReports.getAB4Errors,
      description: 'Get SDK errors graph, separated by destination, for an account and optionally application',
      tags: ['api'],
      plugins: {
        'hapi-swagger': {
          responseMessages: routeModels.standardHTTPErrors
        }
      },
      validate: {
        query: {
          account_id: Joi.objectId().description('Account ID, optional'),
          app_id: Joi.objectId().description('Application ID, optional, either Account ID or App ID should be provided'),
          from_timestamp: Joi.string().description('Report period start timestamp (defaults to 24 hours ago from now)'),
          to_timestamp: Joi.string().description('Report period end timestamp (defaults to now)'),
          device: Joi.string().description('Device name/version to filter'),
          os: Joi.string().description('OS name/version to filter'),
          country: Joi.string().length(2).uppercase().regex(/[A-Z]{2}/).description('Two-letters country code of end user location to filter'),
          operator: Joi.string().description('Operator to filter'),
          network: Joi.string().valid( 'Cellular', 'WiFi' ).description('Network type to filter')
        }
      }
    }
  },

  {
    method: 'GET',
    path: '/v1/stats/sdk/ab/speed',
    config: {
      auth: {
        scope: [ 'user', 'admin', 'reseller', 'revadmin', 'apikey' ]
      },
      handler: SDKReports.getAB4Speed,
      description: 'Get SDK requests processing speed data, separated by destination, for an account and optionally application',
      tags: ['api'],
      plugins: {
        'hapi-swagger': {
          responseMessages: routeModels.standardHTTPErrors
        }
      },
      validate: {
        query: {
          account_id: Joi.objectId().description('Account ID, optional'),
          app_id: Joi.objectId().description('Application ID, optional, either Account ID or App ID should be provided'),
          from_timestamp: Joi.string().description('Report period start timestamp (defaults to 24 hours ago from now)'),
          to_timestamp: Joi.string().description('Report period end timestamp (defaults to now)'),
          device: Joi.string().description('Device name/version to filter'),
          os: Joi.string().description('OS name/version to filter'),
          country: Joi.string().length(2).uppercase().regex(/[A-Z]{2}/).description('Two-letters country code of end user location to filter'),
          operator: Joi.string().description('Operator to filter'),
          network: Joi.string().valid( 'Cellular', 'WiFi' ).description('Network type to filter')
        }
      }
    }
  },

  {
    method: 'GET',
    path: '/v1/stats/edge_cache/{domain_id}',
    config: {
      auth: {
        scope: ['user', 'admin', 'reseller', 'revadmin', 'apikey']
      },
      handler: EdgeCacheReports.getStatsEdgeCache,
      description: 'TODO add text',
      tags: ['api'],
      plugins: {
        'hapi-swagger': {
          responseMessages: routeModels.standardHTTPErrors
        }
      },
      validate: {
        params: {
          domain_id: Joi.objectId().required().description('Domain ID')
        },
        query: {
          from_timestamp: Joi.string().description('Report period start timestamp (defaults to one hour ago from now)'),
          to_timestamp: Joi.string().description('Report period end timestamp (defaults to now)'),
          count: Joi.number().integer().min(1).max(250).description('Number of top objects to report (default to 30)'),
          country: Joi.string().length(2).uppercase().regex(/[A-Z]{2}/).description('Two-letters country code of end user location to filter'),
          os: Joi.string().description('OS name/version to filter'),
          device: Joi.string().description('Device name/version to filter'),
          browser: Joi.string().description('Browser name to filter')
        }
      }
    }
  }


];
