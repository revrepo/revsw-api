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

var boom     = require('boom');
var mongoose = require('mongoose');

var utils           = require('../lib/utilities.js');
var renderJSON      = require('../lib/renderJSON');
var mongoConnection = require('../lib/mongoConnections');
var elasticSearch   = require('../lib/elasticSearch');

var config = require('config');
var logger = require('revsw-logger')(config.log_config);

var DomainConfig = require('../models/DomainConfig');
var domainConfigs = new DomainConfig(mongoose, mongoConnection.getConnectionPortal());

//  ---------------------------------
var topReports_ = function( req, reply, domainName, span ) {

  req.query.report_type = req.query.report_type || 'referer';

  var field;
  switch (req.query.report_type) {
    case 'referer':
      field = 'referer';
      break;
    case 'status_code':
      field = 'response';
      break;
    case 'content_type':
      field = 'cont_type';
      break;
    case 'protocol':
      field = 'ipport';
      break;
    case 'http_protocol':
      field = 'protocol';
      break;
    case 'http_method':
      field = 'method';
      break;
    case 'content_encoding':
      field = 'cont_enc';
      break;
    case 'os':
      field = 'os';
      break;
    case 'device':
      field = 'device';
      break;
    case 'country':
      field = 'geoip.country_code2';
      break;
    case 'cache_status':
      field = 'cache';
      break;
    case 'request_status':
      field = 'conn_status';
      break;
    case 'QUIC':
      field = 'quic';
      break;
    case 'http2':
      field = 'http2';
      break;
    case 'browser':
      field = 'name';
      break;
    default:
      return reply(boom.badImplementation('Received bad report_type value ' + req.query.report_type));
  }

  var requestBody = {
    query: {
      filtered: {
        filter: {
          bool: {
            must: [{
              range: {
                '@timestamp': {
                  gte: span.start,
                  lte: span.end
                }
              }
            }, {
              term: {
                domain: domainName
              }
            }],
            must_not: []
          }
        }
      }
    },
    size: 0,
    aggs: {
      results: {
        terms: {
          field: field,
          size: req.query.count || 30,
          order: {
            _count: 'desc'
          }
        }
      },
      missing_field: {
        missing: {
          field: field
        }
      }
    }
  };

  //  add 2 sub-aggregations for country
  if ( req.query.report_type === 'country' ) {
    requestBody.aggs.results.aggs = {
      regions: {
        terms: {
          field: 'geoip.region_name',
          size: 0
        }
      },
      missing_regions: {
        missing: {
          field: 'geoip.region_name',
        }
      }
    };
  }

  var terms = elasticSearch.buildESQueryTerms(req);
  var sub = requestBody.query.filtered.filter.bool;
  sub.must = sub.must.concat( terms.must );
  sub.must_not = sub.must_not.concat( terms.must_not );

  var indicesList = utils.buildIndexList(span.start, span.end);
  return elasticSearch.getClientURL().search({
      index: indicesList,
      ignoreUnavailable: true,
      timeout: config.get('elasticsearch_timeout_ms'),
      body: requestBody
    })
    .then(function(body) {
      if ( !body.aggregations ) {
        return reply(boom.badImplementation('Aggregation is absent completely, check indices presence: ' + indicesList +
          ', timestamps: ' + span.start + ' ' + span.end + ', domain: ' + domainName ) );
      }

      var data = body.aggregations.results.buckets.map( function( res ) {
        var item = {
          key: res.key,
          count: res.doc_count,
        };
        if ( res.regions && res.regions.buckets.length ) {
          item.regions = res.regions.buckets.map( function( region ) {
            return {
              key: region.key,
              count: region.doc_count,
            };
          });
        }
        if ( res.missing_regions && res.missing_regions.doc_count ) {
          if ( !item.regions ) {
            item.regions = [];
          }
          var region = res.missing_regions;
          item.regions.push({
            key: '--',
            count: region.doc_count,
          });
        }
        return item;
      });

      if ( body.aggregations.missing_field && body.aggregations.missing_field.doc_count ) {
        var res = body.aggregations.missing_field;
        data.push({
          key: '--',
          count: res.doc_count,
        });
      }

      //  special treatment for cache report type to avoid garbage like "-" or just missing field
      if ( field === 'cache' ) {
        data = [{
          key: 'HIT',
          count: data.reduce( function( prev, curr ) {
            return prev + ( curr.key === 'HIT' ? curr.count : 0 );
          }, 0 )
        }, {
          key: 'MISS',
          count: data.reduce( function( prev, curr ) {
            return prev + ( curr.key !== 'HIT' ? curr.count : 0 );
          }, 0 )
        }];
      }

      var response = {
        metadata: {
          domain_name: domainName,
          domain_id: req.params.domain_id,
          start_timestamp: span.start,
          start_datetime: new Date(span.start),
          end_timestamp: span.end,
          end_datetime: new Date(span.end),
          total_hits: body.hits.total,
          data_points_count: body.aggregations.results.buckets.length
        },
        data: data
      };
      // renderJSON(req, reply, error, response);
      renderJSON( req, reply, false/*error is undefined here*/, response );
    })
    .catch( function(error) {
      logger.error(error);
      return reply(boom.badImplementation('Failed to retrieve data from ES for domain ' + domainName));
    });
};

//  ---------------------------------
var top5XX_ = function( req, reply, domainName, span ) {

  var requestBody = {
    query: {
      filtered: {
        filter: {
          bool: {
            must: [{
              range: {
                '@timestamp': {
                  'gte': span.start,
                  'lte': span.end
                }
              }
            }, {
              term: {
                domain: domainName
              }
            }, {
              prefix: {
                response: '5'
              }
            }]
          }
        }
      }
    },
    size: 0,
    aggs: {
      responses: {
        terms: {
          field: 'response',
          size: 30
        },
        aggs: {
          requests: {
            terms: {
              field: 'request',
              size: req.query.count || 30
            }
          }
        }
      }
    }
  };

  var indicesList = utils.buildIndexList(span.start, span.end);
  return elasticSearch.getClientURL().search({
      index: indicesList,
      ignoreUnavailable: true,
      timeout: config.get('elasticsearch_timeout_ms'),
      body: requestBody
    })
    .then(function(body) {

      if ( !body.aggregations ) {
        return reply(boom.badImplementation('Aggregation is absent completely, check indices presence: ' + indicesList +
          ', timestamps: ' + span.start + ' ' + span.end + ', domain: ' + domainName ) );
      }

      var data = {};
      var count = 0;
      for ( var i0 = 0, len0 = body.aggregations.responses.buckets.length; i0 < len0; i0++ ) {
        var item = body.aggregations.responses.buckets[i0];
        data[item.key] = {
          count: item.doc_count,
          requests: []
        };
        for ( var i1 = 0, len1 = item.requests.buckets.length; i1 < len1; ++i1 ) {
          data[item.key].requests.push({
            count: item.requests.buckets[i1].doc_count,
            request: item.requests.buckets[i1].key
          });
          ++count;
        }
      }

      var response = {
        metadata: {
          domain_name: domainName,
          domain_id: req.params.domain_id,
          start_timestamp: span.start,
          start_datetime: new Date(span.start),
          end_timestamp: span.end,
          end_datetime: new Date(span.end),
          total_hits: body.hits.total,
          data_points_count: count
        },
        data: data
      };
      renderJSON( req, reply, false/*error is undefined here*/, response );
    })
    .catch( function(error) {
      logger.error(error);
      return reply(boom.badImplementation('Failed to retrieve data from ES for domain ' + domainName));
    });
};

//  ---------------------------------
exports.getTopReports = function( request, reply ) {

  var domainID = request.params.domain_id;
  domainConfigs.get(domainID, function(error, result) {

    if (error) {
      return reply(boom.badImplementation('Failed to retrieve domain details for ID ' + domainID));
    }

    if (result && utils.checkUserAccessPermissionToDomain(request, result)) {

      var span = utils.query2Span( request.query, 1/*def start in hrs*/, 24/*allowed period in hrs*/ );
      if ( span.error ) {
        return reply(boom.badRequest( span.error ));
      }

      if ( request.query.report_type === 'top5xx' ) {
        return top5XX_( request, reply, result.domain_name, span );
      } else {
        return topReports_( request, reply, result.domain_name, span );
      }
    } else {
      return reply(boom.badRequest('Domain ID not found'));
    }
  });
};

//  ---------------------------------
exports.getTopLists = function( request, reply ) {

  var domainID = request.params.domain_id;
  domainConfigs.get(domainID, function(error, result) {

    if (error) {
      return reply(boom.badImplementation('Failed to retrieve domain details for ID ' + domainID));
    }

    if (result && utils.checkUserAccessPermissionToDomain(request, result)) {

      var span = utils.query2Span( request.query, 1/*def start in hrs*/, 24/*allowed period in hrs*/ );
      if ( span.error ) {
        return reply(boom.badRequest( span.error ));
      }

    var domainName = result.domain_name;
    var requestBody = {
      query: {
        filtered: {
          filter: {
            bool: {
              must: [{
                range: {
                  '@timestamp': {
                    gte: span.start,
                    lte: span.end
                  }
                }
              }, {
                term: {
                  domain: domainName
                }
              }]
            }
          }
        }
      },
      size: 0,
      aggs: {
        oses: {
          terms: {
            field: 'os',
            size: 250
          }
        },
        devices: {
          terms: {
            field: 'device',
            size: 250
          }
        },
        countries: {
          terms: {
            field: 'geoip.country_code2',
            size: 250
          }
        },
        browsers: {
          terms: {
            field: 'name',
            size: 250
          }
        },
      }
    };

    var indicesList = utils.buildIndexList(span.start, span.end);
    return elasticSearch.getClientURL().search({
        index: indicesList,
        ignoreUnavailable: true,
        timeout: config.get('elasticsearch_timeout_ms'),
        body: requestBody
      })
      .then(function(body) {
        if ( !body.aggregations ) {
          return reply(boom.badImplementation('Aggregation is absent completely, check indices presence: ' + indicesList +
            ', timestamps: ' + span.start + ' ' + span.end + ', domain: ' + domainName ) );
        }

        var sorter = function( lhs, rhs ) {
          return lhs.localeCompare( rhs );
        };
        var response = {
          metadata: {
            domain_name: domainName,
            domain_id: request.params.domain_id,
            start_timestamp: span.start,
            start_datetime: new Date(span.start),
            end_timestamp: span.end,
            end_datetime: new Date(span.end),
            total_hits: body.hits.total
          },
          data: {
            os: body.aggregations.oses.buckets.map( function( item ) {
                return item.key;
              }).sort( sorter ),
            device: body.aggregations.devices.buckets.map( function( item ) {
                return item.key;
              }).sort( sorter ),
            browser: body.aggregations.browsers.buckets.map( function( item ) {
                return item.key;
              }).sort( sorter ),
            country: body.aggregations.countries.buckets.map( function( item ) {
                return { key: item.key, value: ( utils.countries[item.key] || item.key ) };
              }).sort( function( lhs, rhs ) {
                return lhs.value === 'United States' ? -1 : ( rhs.value === 'United States' ? 1 : lhs.value.localeCompare(rhs.value) );
              })
          }
        };
        renderJSON( request, reply, false/*error is undefined here*/, response );
      })
      .catch( function(error) {
        logger.error(error);
        return reply(boom.badImplementation('Failed to retrieve data from ES for domain ' + domainName));
      });

    } else {
      return reply(boom.badRequest('Domain ID not found'));
    }
  });
};

