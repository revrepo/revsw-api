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

var boom     = require('boom');
var mongoose = require('mongoose');
var _ = require('lodash');
var utils           = require('../lib/utilities.js');
var renderJSON      = require('../lib/renderJSON');
var mongoConnection = require('../lib/mongoConnections');
var elasticSearch   = require('../lib/elasticSearch');

var config = require('config');
var logger = require('revsw-logger')(config.log_config);

var DomainConfig = require('../models/DomainConfig');
var domainConfigs = new DomainConfig(mongoose, mongoConnection.getConnectionPortal());

var maxTimePeriodForTrafficGraphsDays = config.get('max_time_period_for_traffic_graphs_days');
var GEO_COUNTRIES_REGIONS = require('../config/geo_countries_regions');
//  ---------------------------------
var topReports_ = function( req, reply, domainConfig, span ) {

  var reportType = req.query.report_type || 'referer';
  var domainName = domainConfig.domain_name,
    field;

  switch (reportType) {
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
      return reply(boom.badImplementation('Received bad report_type value ' + reportType));
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
            }]
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
  if ( reportType === 'country' ) {
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

  //  update query
  elasticSearch.buildESQueryTerms( requestBody.query.filtered.filter.bool, req, domainConfig );

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
            var region_ = {
              key: region.key,
              count: region.doc_count
            };
            // NOTE: add 'hc-key' for show data on highcharts map
            var countryInfo = _.find(GEO_COUNTRIES_REGIONS, function(item) {
                return item.code_iso2 === res.key;
            });
            if(!!countryInfo) {
              var i = _.find(countryInfo.regions, function(itm) {
                return itm.code === region.key;
              });
              if(!!i) {
                region_['hc-key'] = i['hc-key'];
              }
            }
            return region_ ;
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
      return reply(boom.badImplementation('Failed to retrieve data from ES for domain ' + domainName));
    });
};

//  ---------------------------------
var top5XX_ = function( req, reply, domainConfig, span ) {

  var domainName = domainConfig.domain_name;
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

  //  update query
  elasticSearch.buildESQueryTerms( requestBody.query.filtered.filter.bool, req, domainConfig );

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
      return reply(boom.badImplementation('Failed to retrieve data from ES for domain ' + domainName));
    });
};
/**
 * @name topImageEngineChanges_
 *
 * @param {*} req
 * @param {*} reply
 * @param {*} domainConfig
 * @param {*} span
 */
var topImageEngineChanges_ = function (req, reply, domainConfig, span){
  var reportType_ = req.query.report_type;
  var countSize_ = req.query.count || 30;
  var domainName = domainConfig.domain_name,
    domainId = req.params.domain_id,
    fieldOrigin_, filedChanged_, fieldName_;

  switch (reportType_) {
    case 'ie_format_changes':
      fieldOrigin_ = 'ie_format_o';
      filedChanged_ = 'ie_format';
      fieldName_= 'ie_format_c';
      break;
    case 'ie_resolution_changes':
      fieldOrigin_ = 'ie_res_o';
      filedChanged_ = 'ie_res';
      fieldName_= 'ie_res_c';
      break;
    default:
      return reply(boom.badImplementation('Received bad report_type value ' + reportType_));
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
            }]
          }
        }
      }
    },
    size: 0,
    aggs: {
      changed:{
        terms:{
          script: 'doc["'+fieldOrigin_+'"]!=doc["'+filedChanged_+'"]'
        },
        aggs:{
          results: {
            terms: {
              field: fieldName_,
              size: countSize_,
                order: {
                _count: 'desc'
                }
            }
          }
        }
      },
      missing_field: {
        missing: {
          field: fieldName_
        }
      }
    }
  };

  //  update query
  elasticSearch.buildESQueryTerms(requestBody.query.filtered.filter.bool, req, domainConfig);

  var indicesList = utils.buildIndexList(span.start, span.end);
  return elasticSearch.getClientURL().search({
    index: indicesList,
    ignoreUnavailable: true,
    timeout: config.get('elasticsearch_timeout_ms'),
    body: requestBody
  })
    .then(function (body) {
      if (!body.aggregations) {
        return reply(boom.badImplementation('Aggregation is absent completely, check indices presence: ' + indicesList +
          ', timestamps: ' + span.start + ' ' + span.end + ', domain: ' + domainName));
      }

      var data = [], transformed = 0,origins = 0;
      body.aggregations.changed.buckets.forEach(function (res) {
        if(res.key === 'true'){
          transformed = res.doc_count;
        }
        if (res.key === 'false') {
          origins = res.doc_count;
        }
        var item = {
          changed: res.key
        };

        if (!!res.results.buckets && res.results.buckets.length > 0){
          res.results.buckets.forEach(function(itemData){
            data.push(_.extend({},item,{key:itemData.key, count: itemData.doc_count}));
          });
        }
        return item;
      });

      var response = {
        metadata: {
          domain_name: domainName,
          domain_id: domainId,
          start_timestamp: span.start,
          start_datetime: new Date(span.start),
          end_timestamp: span.end,
          end_datetime: new Date(span.end),
          total_hits: body.hits.total,
          total_transformation: transformed,
          data_points_count: transformed + origins//body.aggregations.changed.buckets.length
        },
        data: data
      };

      renderJSON(req, reply, false/*error is undefined here*/, response);
    })
    .catch(function (error) {
      return reply(boom.badImplementation('Failed to retrieve data from ES for domain ' + domainName));
    });
};
//  ---------------------------------
exports.getTopReports = function( request, reply ) {

  var domainID = request.params.domain_id;
  domainConfigs.get(domainID, function(error, domainConfig) {

    if (error) {
      return reply(boom.badImplementation('Failed to retrieve domain details for ID ' + domainID));
    }

    if (domainConfig && utils.checkUserAccessPermissionToDomain(request, domainConfig)) {

      var span = utils.query2Span( request.query, 1/*def start in hrs*/, 24/*allowed period in hrs*/ );
      var spanLimit31days = utils.query2Span(request.query, 1/*def start in hrs*/,31*24/*allowed period in hrs*/);

      switch (request.query.report_type){
        case 'ie_format_changes':
        case 'ie_resolution_changes':
          if (spanLimit31days.error) {
            return reply(boom.badRequest(spanLimit31days.error));
          }
          return topImageEngineChanges_(request, reply, domainConfig, span);
        case 'top5xx':
          if (span.error) {
            return reply(boom.badRequest(span.error));
          }
          return top5XX_(request, reply, domainConfig, span);
          // break;
        default:
          if (span.error) {
            return reply(boom.badRequest(span.error));
          }
          return topReports_(request, reply, domainConfig, span);
      }

    } else {
      return reply(boom.badRequest('Domain ID not found'));
    }
  });
};

//  ---------------------------------
exports.getTopLists = function( request, reply ) {

  var domainID = request.params.domain_id;
  domainConfigs.get(domainID, function(error, domainConfig) {

    if (error) {
      return reply(boom.badImplementation('Failed to retrieve domain details for ID ' + domainID));
    }

    if (domainConfig && utils.checkUserAccessPermissionToDomain(request, domainConfig)) {

      var span = utils.query2Span(request.query, 1/*def start in hrs*/, 24 * maxTimePeriodForTrafficGraphsDays /*allowed period - max count days */);
      if ( span.error ) {
        return reply(boom.badRequest( span.error ));
      }

    var domainName = domainConfig.domain_name;
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

    if ( request.query.status_codes ) {
      requestBody.aggs.status_codes = {
        terms: { field: 'response' }
      };
    }

    //  update query
    elasticSearch.buildESQueryTerms( requestBody.query.filtered.filter.bool, false, domainConfig );

    var indicesList = utils.buildIndexList(span.start, span.end);
    return elasticSearch.getClient().search({
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

        if ( request.query.status_codes ) {
          response.data.status_code = body.aggregations.status_codes.buckets.map( function( item ) {
            return item.key;
          }).sort( sorter );
        }

        renderJSON( request, reply, false/*error is undefined here*/, response );
      })
      .catch( function(error) {
        return reply(boom.badImplementation('Failed to retrieve data from ES for domain ' + domainName));
      });

    } else {
      return reply(boom.badRequest('Domain ID not found'));
    }
  });
};

