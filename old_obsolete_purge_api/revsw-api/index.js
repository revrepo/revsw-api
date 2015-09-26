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



// call the packages we need

var express = require('express'); // call express
var app = express(); // define our app using express

var bodyParser = require('body-parser');

// parse application/json

var route = express.Router(); // get an instance of the express Router

var forwarded = require('forwarded-for');
var ipware = require("ipware");

// Router node module
//var router = require('router');
//var route = router();

// Settings
//var settings = require("./settings");
var settings = require("./config/config");

/*********** For SysLog Integration **********/
var revlogger = require("rev-logger");
/*********** For SysLog Integration **********/

var crypto = require('crypto');
var uuid = require('node-uuid');

// Http node module
var http = require('http');
var https = require('https');
var fs = require('fs');

var WebSocket = require('ws');
var WebSocketClient = require('websocket').client;

revlogger.log('info', 'Starting Purge API service');

var purge_version = 1.0;

//route.use(bodyParser.json())

//for loading mongo client
var MongoClient = require('mongodb').MongoClient;

var connection = null;
var localConObj = null;
var portalConObj = null;

var statusMsgObj = {
  "connectFail": ["501", "Internal Server Error"],
  "saveFail": ["501", "Internal Server Error"],
  "queryFail": ["501", "Internal Server Error"],
  "invalidData": ["404", "Invalid Request"],
  "domainNotAssociated": ["403", "User not Authorized"],
  "invalidEmail": ["405", "User not Authorized"]
};
var allowedMethods = [ "/purge", "/checkStatus", "/healthcheck" ];

function openLocalDBConnection() {
  var mngoUrl = "mongodb://" + settings.local_mongo.url + ":" + settings.local_mongo.port + "/" + settings.local_mongo.database;

  if (settings.local_mongo.is_auth_required) {
    mngoUrl = "mongodb://" + settings.local_mongo.username + ":" + settings.local_mongo.password + "@" + settings.local_mongo.url + ":" + settings.local_mongo.port + "/" + settings.local_mongo.database;
  }

  MongoClient.connect(mngoUrl, function (err, db) {
    if (err) {
      revlogger.log('error', 'Failed to connect to the Purge MDB service, error: ' + err);
    } else {
      revlogger.log('info', 'Connected to the Purge MDB service');
      localConObj = db;
    }
  });
}

function openPortalDBConnection() {
  var mngoUrl = "mongodb://" + settings.portal_mongo.url + ":" + settings.portal_mongo.port + "/" + settings.portal_mongo.database;

  if (settings.portal_mongo.is_auth_required) {
    mngoUrl = "mongodb://" + settings.portal_mongo.username + ":" + settings.portal_mongo.password + "@" + settings.portal_mongo.url + ":" + settings.portal_mongo.port + "/" + settings.portal_mongo.database;
  }

  MongoClient.connect(mngoUrl, function (err, pdb) {
    if (err) {
      revlogger.log('error', 'Failed to connect to the Configuration MDB service, error: ' + err);
    } else {
      revlogger.log('info', 'Connected to the Configuration MDB service');
      portalConObj = pdb;
    }
  });
}

revlogger.log('info', 'Connecting to required databases...');

openLocalDBConnection();
openPortalDBConnection();

app.use(function (req, res, next) {
  // ADED FOR USER IP
  var user_ip = "";
  if (settings.use_x_forwarded_for) {
//    console.log("Using X-forwarded");
    var address = forwarded(req, req.headers);
    //console.log("ADDRESS",address);
    if (address) {
      user_ip = address.ip;
    }
  } else {
    console.log("Using ip ware");

    var get_ip = ipware().get_ip;
    var ip_info = get_ip(req);
    if (ip_info) {
      user_ip = ip_info.clientIp;
    }
  }

  //common action
  if (allowedMethods.indexOf(req.url) == -1) {
    console.log(Date() + " : Invalid method name", req.url, " Allowed methods : ", allowedMethods);

    res.writeHead(200, {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "*"
    });

    var resJson = {};
    resJson.code = "404";
    resJson.message = "Invalid Request";
    console.log("Response", JSON.stringify(resJson));
    revlogger.log('info', user_ip + " :: " + new Date() + " :: " + resJson.message);
    console.log(Date() + " :: " + user_ip + " :: " + resJson.message);
    res.end(JSON.stringify(resJson) + '\n');
  } else {
    if (req.method != "POST" && req.method !== "GET" && req.method !== "OPTIONS") {
      console.log(Date() + " :: " + user_ip + " :: Invalid method type ", req.method, "Allowed methods: POST, GET");

      res.writeHead(200, {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "*"
      });

      var resJson = {};
      resJson.code = "404";
      resJson.message = "Invalid Request";

      revlogger.log('info', user_ip + " :: " + new Date() + " :: " + resJson.message);
      console.log(Date() + " :: " + user_ip + " :: " + resJson.message);

      console.log("Response", JSON.stringify(resJson));
      res.end(JSON.stringify(resJson) + '\n');

    } else {

      if (req.method === "OPTIONS") {
        revlogger.log('debug', 'Served OPTIONS request from user IP ' + user_ip);
        res.writeHead(200, {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "POST,OPTIONS",
          "Access-Control-Allow-Headers": 'Content-Type, Authorization, Content-Length, X-Requested-With'
        });
        res.end();
      };
      next();

    }
  }
});

app.use(bodyParser.json());

// to support JSON-encoded bodies
//app.bodyParser({strict:false});
app.use(bodyParser.urlencoded({
  extended: true
}));

/**
 * HTTP GET for purge API
 */
app.get('/purge', function (request, response) {
  response.writeHead(200, {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "*"
  });

  console.log(Date() + ": Purge() - Some parameters missed in your curl command");

  var purgeJson = {};
  purgeJson.status = "404";
  purgeJson.message = "Invalid Request";
  console.log("Response", JSON.stringify(purgeJson));

  response.end(JSON.stringify(purgeJson) + '\n');
});

app.post('/purge', function (request, response) {
  // parsing request url
  // ADED FOR USER IP
  var user_ip = "";
  if (settings.use_x_forwarded_for) {
    var address = forwarded(request, request.headers);
    //console.log("ADDRESS",address);
    if (address) {
      user_ip = address.ip;
    }
  } else {
    var get_ip = ipware().get_ip;
    var ip_info = get_ip(request);
    if (ip_info) {
      user_ip = ip_info.clientIp;
    }
  }

  response.writeHead(200, {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "*"
  });

  console.log('Received request (body part): ', request.body);

  if (request.body && request.body.domainName && request.body.domainName != "" && request.body.domainName != undefined) {
    var dom_name = request.body.domainName;
    delete request.body.domainName;

    var json = {};

    json.version = purge_version;

    json.purges = request.body.purges;

    //var json = request.body;

    if (json.purges && json.purges != "" && json.purges != undefined) {
      //	json.purges[0].url.domain=dom_name;
      for (var i = 0; i < json.purges.length; i++) {
        json.purges[i].url.domain = dom_name;
      }

      var header = request.headers['authorization'] || ''; // get the header
      revlogger.log('debug', 'Header authorization = ' + header);
  
      var token = header.split(/\s+/).pop() || '', // and the encoded auth token
        auth = new Buffer(token, 'base64').toString(), // convert from base64
        parts = auth.split(/:/), // split on colon
        useremail = parts[0],
        password = parts[1];

      if ((header != "" || header != undefined) && (auth != "" && auth != undefined) && parts.length == 2) {
        checkDomain(useremail, password, dom_name, json, user_ip, function (stat) {
          var respJson = {};
          var statMsgArr = Object.keys(statusMsgObj);

          if (statMsgArr.indexOf(stat) == -1) {
            respJson.status = 202;
            respJson.request_id = stat;
            respJson.message = "The purge request has been successfully queued";
          } else {
            respJson.status = Number(statusMsgObj[stat][0]);
            respJson.message = statusMsgObj[stat][1];
            revlogger.log('info', user_ip + " :: " + new Date() + " :: " + statusMsgObj[stat][1]);

          }
          response.end(JSON.stringify(respJson) + '\n');
        });
      } else {
        console.log(Date() + " :: " + user_ip + " :: Purge() - Missing User Credentilas in your curl command");

        var purgeJson = {};
        purgeJson.status = "404";
        purgeJson.message = "Invalid Request";
        console.log("Response", JSON.stringify(purgeJson));
        revlogger.log('info', user_ip + " :: " + new Date() + " :: Missing User Credentilas in your curl command");

        response.end(JSON.stringify(purgeJson) + '\n');
      }
    } else {
      console.log(Date() + " :: " + user_ip + " :: Purge() - InValid Json -- Purge Tag missed in your json");

      var purgeJson = {};
      purgeJson.status = "404";
      purgeJson.message = "Invalid Request";
      console.log("Response", JSON.stringify(purgeJson));
      revlogger.log('info', user_ip + " :: " + new Date() + " :: InValid Json -- Purge Tag missed in your json");

      response.end(JSON.stringify(purgeJson) + '\n');
    }
  } else {

    var purgeJson = {};
    purgeJson.status = "404";
    purgeJson.message = "Invalid Request";
    console.log("Response", JSON.stringify(purgeJson));
    revlogger.log('warning', 'User IP: ' + user_ip + ', username: "' + useremail + '", InValid Json -- Either Json can be invalid or some parameters might be missing in the json');

    response.end(JSON.stringify(purgeJson) + '\n');
  }
});

function checkDomain(usr_email, usr_pswd, dom_name, b_obj, user_ip, callback) {
  if (usr_email && usr_pswd && dom_name) {
    if (portalConObj && portalConObj != null) {
      var collection_usr = portalConObj.collection(settings.portal_mongo.user_collection);
      if (collection_usr) {
        collection_usr.findOne({
          email: usr_email,
          password: get_hash(usr_pswd)
        }, function (err, userDet) {
          if (err) {
            console.log(Date() + " : checkDomain() - Error while getting the user details from db", err);

            //db.close();
            callback("queryFail");
          } else {
            if (userDet) {
              //revlogger.log('debug',"USER DET : "+JSON.stringify(userDet));

              var dom_list = userDet.domain.split(',');
              if (dom_list.indexOf(dom_name) != -1) {
                var collection_dom = portalConObj.collection(settings.portal_mongo.domain_collection);
                if (collection_dom) {
                  collection_dom.findOne({
                    name: dom_name,
                    status: true
                  }, function (err, domainDet) {
                    if (err) {
                      console.log(Date() + " : checkDomain() - Error while getting the policy list of the domain", err);

                      //db.close();
                      callback("queryFail");
                    } else {
                      var bp_list = domainDet.stats_url.split(','),
                        bp = 0;
                      getbp_list();

                      function getbp_list() {
                        if (bp < bp_list.length) {
                          bp_list[bp] = bp_list[bp].split(':')[0];
                          bp++;
                          getbp_list();
                        } else {
                          save_proxylist(userDet.firstname + " " + userDet.lastname, usr_email, dom_name, bp_list, b_obj, user_ip, function (statMsg) {
                            //db.close();

                            callback(statMsg);
                          });
                        }
                      }
                    }
                  });
                } else {
                  revlogger.log('error', 'In function checkDomain() - Error while getting db connection');

                  //db.close();
                  callback("connectFail");
                }

              } else {
                revlogger.log('warning', 'User "' + usr_email + '"  is not associated with domain "' + dom_name + '", user IP address: ' + user_ip);

                //db.close();
                callback("domainNotAssociated");
              }
            } else {
              revlogger.log('warning', 'User "' + usr_email + '" not found in the database, user IP address: ' + user_ip);

              //db.close();
              callback("invalidEmail");
            }
          }
        });
      } else {
        //db.close();
        callback("connectFail");
      }
    } else {
      callback("connectFail");
    }
  } else {
    console.log(Date() + " : Invalid useremail or password or domainName");

    callback("invalidData")
  }
}

var get_hash = function (password) {
  return crypto.createHash('md5').update(password).digest("hex");
};

function save_proxylist(req_user_name, req_email, req_domain, proxy_lists, req_obj, user_ip, callback) {
  //console.log("proxy_lists---->",proxy_lists.join(','));

  var res_obj = {};
  res_obj["req_id"] = uuid.v1();
  res_obj["req_email"] = req_email;
  res_obj["req_domain"] = req_domain;
  res_obj["req_status"] = "pending";
  res_obj["proxy_list"] = proxy_lists.join(',').toLowerCase();
  res_obj["retry_proxy_list"] = "";
  res_obj["proxy_suc_count"] = 0;
  res_obj["proxy_suc_list"] = "";
  res_obj["proxy_fail_count"] = 0;
  res_obj["request_json"] = req_obj;
  res_obj["create_date_time"] = new Date().toISOString();
  res_obj["request_process_time"] = new Date().toISOString();

  revlogger.log('debug', 'User IP: ' + user_ip + ', username: "' + req_email + '", domain: "' + req_domain + '", request ID: ' + res_obj["req_id"] + ', request JSON: ' + JSON.stringify(req_obj));

  if (localConObj && localConObj != null) {
    var collection_new = localConObj.collection(settings.local_mongo.purge_jobs_collection);
    if (collection_new) {
      collection_new.insert(res_obj, function (err, result) {
        if (err) {
          console.log(Date() + " : saveProxyList() - Error while saving purge details", err);

          //db.close();
          callback("saveFail");
        } else {
          // db.close();
          callback(res_obj["req_id"]);
        }
      });
    } else {
      console.log(Date() + " : saveProxyList() - Error while connecting to mongo db", err);

      //db.close();
      callback("connectFail");
    }
  } else {
    console.log(Date() + " : saveProxyList() - Error while connecting to mongo db", err);

    callback("connectFail");
  }
}

process.on('uncaughtException', function (err) {
  if (err)
    console.log('Caught exception : ' + err);
  else
    console.log('Error Object is undefined');
});

/**
 * This function is used to process inProgress purge
 */
var CronJob = require('cron').CronJob;
new CronJob('7 */2 * * * *', function () {
  processInProgressRequest();
}, null, true, "America/Los_Angeles");

var processInProgressRequest = function () {
  //console.log("Calling in-progress job");
  var timeOut = 120000;
  //console.log("Calling processInProgressRequest()");
  if (localConObj && localConObj != null) {
    // Fetch the collection User
    var collection = localConObj.collection(settings.local_mongo.purge_jobs_collection);

    if (collection) {
      var date = (new Date().getTime()) - timeOut;
      date = new Date(date).toISOString();

      var query = {
        req_status: "InProgress",
        "request_process_time": {
          $lt: date
        }
      }

      //	console.log("QUERY",query);

      collection.find(query).sort({
        $natural: 1
      }).limit(20).toArray(function (err, data) {
        if (err) {
          console.log(Date() + " : processInProgressRequest() - Error while getting the inprogress purge list", err);
          //db.close();
        } else {
          //console.log("DATA",data.length);
          var i = 0;
          processInProgressData();

          function processInProgressData() {
            if (i < data.length) {
              var purgeObj = data[i];
              //console.log("PURGE OBJ",JSON.stringify(purgeObj));

              if (purgeObj && purgeObj.proxy_list) {
                //var a ="54.148.5.151,54.191.155.154,54.67.106.19,52.0.222.120,52.1.146.205,54.67.46.115"

                compareTwoArrays(purgeObj.proxy_list.split(","), purgeObj.proxy_suc_list.split(","), function (status, failed_proxies) {
                  if (status) {
                    //if(arraysIdentical(purgeObj.proxy_list.split(","), a.split(","))) {
                    //console.log("Both the arrays same",purgeObj.proxy_suc_list)
                    collection.update({
                      req_id: purgeObj.req_id
                    }, {
                      $set: {
                        req_status: "success"
                      }
                    }, function (err, updPurgeDet) {
                      i++;
                      processInProgressData();
                    });
                  } else {
                    //console.log("Both the arrays not same",purgeObj.proxy_suc_list)
                    collection.update({
                      req_id: purgeObj.req_id
                    }, {
                      $set: {
                        req_status: "failed"
                      }
                    }, function (err, updPurgDet) {
                      if (err) {
                        //console.log("ERr", err);
                      } else {
                        //	console.log("In failed stat change blk");	
                        i++;
                        processInProgressData();
                      }
                    });
                  }
                });
              }
            }
          }
        }
      });
    } else {
      console.log(Date() + " : processInProgressRequest() - Error while getting collection object");
    }
  } else {
    console.log(Date() + " : processInProgressRequest() - Error while getting db object");
  }
}

//function arraysIdentical(arr1, arr2) {
var compareTwoArrays = function (arr1, arr2, callback) {
  var status = true;
  var failed_proxy_arr = [];
  for (var i = 0; i < arr1.length; i++) {
    if (arr2.indexOf(arr1[i].toLowerCase()) == -1) {
      failed_proxy_arr.push(arr1[i].toLowerCase());
      status = false;
    }
    if (i == arr1.length - 1) {
      if (failed_proxy_arr.length == 0) {
        status = true;
      }
      callback(status, failed_proxy_arr);
    }
  }
};

/**
 * This function is used for pending purge details
 */
var CronJob = require('cron').CronJob;
new CronJob('* * * * * *', function () {
  processPurgeReq("pending");
}, null, true, "America/Los_Angeles");

/**
 * This function is used for failed purge details
 */
var CronJob = require('cron').CronJob;
new CronJob('*/1 * * * *', function () {
  processFailedPurgeReq("failed");
}, null, true, "America/Los_Angeles");

var processFailedPurgeReq = function (request_status) {
  //connect away
  if (localConObj && localConObj != null) {
    // Fetch the collection User
    var collection = localConObj.collection(settings.local_mongo.purge_jobs_collection);
    if (collection) {

      //collection.find( { $or: [ { req_status: "pending" }, { req_status: "failed" } ] }).toArray(function(err,data) {
      //collection.find( { $or: [ { req_status: "pending" }, { req_status: "failed" } ] },function(err, data) {

      collection.find({
        req_status: request_status
      }).sort({
        $natural: 1
      }).limit(5).toArray(function (err, data) {
        //collection.findAndModify({req_status: request_status},{$set: {"create_date_time": new Date()}}).sort({$natural:1}).limit(5).toArray(function(err,data) {
        //collection.findAndModify({ req_status: request_status },[{create_date_time:1}],{$set: {create_date_time: new Date().toISOString()}},function(err,data) {
        if (err) {
          console.log(Date() + " : processPurgeReq() - Error while getting the purge list for ", request_status, "status");
          //db.close();
        } else {

          if (data.length == 0) {
            //db.close();
          } else {
            //var j=0;
            //var proxy_list = data[j].proxy_list;

            //if(data[j].req_status=='failed') {
            //	proxy_list = data[j].retry_proxy_list;
            //}

            //console.log("DOM NAME",data[j].req_domain);

            // sendPurgeJsonToProxyListWs(data[j].req_id ,proxy_list, data[j].request_json, data[j].req_status, function(val) {
            //    	//db.close();
            // });

            var j = 0;
            iteratePurgeData();

            function iteratePurgeData() {
              if (j < data.length) {
                if (data[j].proxy_list) {
                  var proxy_list = data[j].proxy_list;

                  if (data[j].req_status == 'failed') {
                    proxy_list = data[j].retry_proxy_list;

                    compareTwoArrays(data[j].proxy_list.split(","), data[j].proxy_suc_list.split(","), function (status, failed_proxies) {
                      var request_json = {};
                      request_json.version = data[j].request_json.version;
                      request_json.request_id = data[j].req_id;
                      request_json.purges = data[j].request_json.purges;

                      sendPurgeJsonToFailedProxyListWs(data[j].req_id, failed_proxies.join(","), request_json, data[j].req_status, function (val) {
                        j++;
                        iteratePurgeData();
                      });
                    });

                  } else {
                    // for adding request id just below the version number
                    var request_json = {};
                    request_json.version = data[j].request_json.version;
                    request_json.request_id = data[j].req_id;
                    request_json.purges = data[j].request_json.purges;

                    sendPurgeJsonToFailedProxyListWs(data[j].req_id, proxy_list, request_json, data[j].req_status, function (val) {
                      j++;
                      iteratePurgeData();
                    });
                  }
                } else {
                  j++;
                  iteratePurgeData();
                }
              } else {
                //db.close();
              }
            }
          }
        }
      });
    } else {
      console.log(Date() + " : processPurgeReq() - Error while getting db object");
      //db.close();	
    }
    //});
  } else {
    console.log(Date() + " : processPurgeReq() - Error while connecting to mongo", err);
  }
};

var editPurgeStatFromFailedToInProgress = function (req_id, callback) {
  //connect away

  if (localConObj && localConObj != null) {
    var collection = localConObj.collection(settings.local_mongo.purge_jobs_collection);

    if (collection) {

      collection.findAndModify({
        req_id: req_id,
        req_status: "failed"
      }, [], {
        $set: {
          req_status: "InProgress",
          request_process_time: new Date().toISOString()
        }
      }, {}, function (err, purgeDet) {
        if (err) {
          callback(false);
          //db.close();
          console.log(Date() + " : editPurgeStatFromFailedToInProgress() - Error while getting  purge data by req_id", err);
        } else {
          if (purgeDet) {
            callback(true);
          } else {
            callback(false);
          }
        }
      });
    } else {
      console.log(Date() + " : editPurgeStatFromFailedToInProgress() - Error while getting db object");

      //db.close();	
      callback(false);
    }
    //}
    //});
  } else {
    console.log(Date() + " : editPurgeStatFromFailedToInProgress() - Error while connecting to mongo db", err);

    callback(false);
  }
};

/**var editPurgeStatFromFaileToInProgress = function(req_id, callback){
	//connect away

	if(localConObj && localConObj!=null) {
		var collection = localConObj.collection(settings.local_mongo.purge_jobs_collection);

		if(collection) {
		 	collection.findOne({req_id: req_id},function(err, purgeDet) {
		    	if(err){
		    		callback(false);
		    		//db.close();
					console.log(Date()+ " : editPurgeStatToInProgress() - Error while getting  purge data by req_id", err);
		    	}else{
		    		if(purgeDet.req_status=="InProgress") {
		    			//db.close();
						callback(false);
		    		} else {
		    			collection.update({ req_id: req_id },{$set: {req_status:"InProgress",create_date_time: new Date().toISOString()}},function(err, purgeDet) {
							if(err) {
								console.log(Date()+ " : editPurgeStatToInProgress() - Error while updating proxy status to INPROGRESS");

								//db.close();
							}
							//db.close();
							callback(true);
						});
		    		}

		    	}
			});
		} else {
			console.log(Date()+ " : editPurgeStatToInProgress() - Error while getting db object");

			//db.close();	
		 	callback(false);
		}
		//}
	//});
    } else {
    	console.log(Date()+ " : editPurgeStatToInProgress() - Error while connecting to mongo db", err);

		callback(false);
    }
};
*/

var processPurgeReq = function (request_status) {
  //console.log("REQ STATUS",request_status);

  //connect away
  if (localConObj && localConObj != null) {
    // Fetch the collection User
    var collection = localConObj.collection(settings.local_mongo.purge_jobs_collection);
    if (collection) {

      //collection.find( { $or: [ { req_status: "pending" }, { req_status: "failed" } ] }).toArray(function(err,data) {
      //collection.find( { $or: [ { req_status: "pending" }, { req_status: "failed" } ] },function(err, data) {

      //collection.find( { $or: [ { req_status: "pending" }, { req_status: "failed" } ] }).sort({$natural:1}).limit(5).toArray(function(err,data) {
      collection.find({
        req_status: request_status
      }).sort({
        $natural: 1
      }).limit(5).toArray(function (err, data) {
        if (err) {
          console.log(Date() + " : processPurgeReq() - Error while getting the purge list for ", request_status, "status");
          //db.close();
        } else {

          if (data.length == 0) {
            //db.close();
          } else {
            var j = 0;
            var proxy_list = data[j].proxy_list;

            if (data[j].req_status == 'failed') {
              proxy_list = data[j].retry_proxy_list;
            }

            //console.log("DOM NAME",data[j].req_domain);

            // sendPurgeJsonToProxyListWs(data[j].req_id ,proxy_list, data[j].request_json, data[j].req_status, function(val) {
            //    	//db.close();
            // });

            var j = 0;
            iteratePurgeData();

            function iteratePurgeData() {
              if (j < data.length) {
                if (data[j].proxy_list) {
                  var proxy_list = data[j].proxy_list;

                  if (data[j].req_status == 'failed') {
                    proxy_list = data[j].retry_proxy_list;
                  }

                  // for adding request id just below the version number
                  var request_json = {};
                  request_json.version = data[j].request_json.version;
                  request_json.request_id = data[j].req_id;
                  request_json.purges = data[j].request_json.purges;

                  sendPurgeJsonToProxyListWs(data[j].req_id, proxy_list, request_json, data[j].req_status, function (val) {
                    j++;
                    iteratePurgeData();
                  });
                } else {
                  j++;
                  iteratePurgeData();
                }
              } else {
                //db.close();
              }
            }
          }
        }
      });
    } else {
      console.log(Date() + " : processPurgeReq() - Error while getting db object");
      //db.close();	
    }
    //});
  } else {
    console.log(Date() + " : processPurgeReq() - Error while connecting to mongo", err);
  }
};

/**var editPurgeStatToInProgress = function(req_id, callback){
	//connect away

	if(localConObj && localConObj!=null) {
		var collection = localConObj.collection(settings.local_mongo.purge_jobs_collection);

		if(collection) {
		 	collection.findOne({req_id: req_id},function(err, purgeDet) {
		    	if(err){
		    		callback(false);
		    		//db.close();
					console.log(Date()+ " : editPurgeStatToInProgress() - Error while getting  purge data by req_id", err);
		    	}else{
		    		if(purgeDet.req_status=="InProgress") {
		    			//db.close();
						callback(false);
		    		} else {
		    			collection.update({ req_id: req_id },{$set: {req_status:"InProgress"}},function(err, purgeDet) {
							if(err) {
								console.log(Date()+ " : editPurgeStatToInProgress() - Error while updating proxy status to INPROGRESS");

								//db.close();
							}
							//db.close();
							callback(true);
						});
		    		}

		    	}
			});
		} else {
			console.log(Date()+ " : editPurgeStatToInProgress() - Error while getting db object");

			//db.close();	
		 	callback(false);
		}
		//}
	//});
    } else {
    	console.log(Date()+ " : editPurgeStatToInProgress() - Error while connecting to mongo db", err);

		callback(false);
    }
};
*/

var editPurgeStatToInProgress = function (req_id, callback) {
  //connect away

  if (localConObj && localConObj != null) {
    var collection = localConObj.collection(settings.local_mongo.purge_jobs_collection);

    if (collection) {
      collection.findAndModify({
        req_id: req_id,
        req_status: "pending"
      }, [], {
        $set: {
          req_status: "InProgress"
        }
      }, {}, function (err, purgeDet) {
        if (err) {
          callback(false);
          //db.close();
          console.log(Date() + " : editPurgeStatToInProgress() - Error while getting  purge data by req_id", err);
        } else {
          if (purgeDet) {
            callback(true);
          } else {
            callback(false);
          }
        }
      });
    } else {
      console.log(Date() + " : editPurgeStatToInProgress() - Error while getting db object");

      //db.close();	
      callback(false);
    }
    //}
    //});
  } else {
    console.log(Date() + " : editPurgeStatToInProgress() - Error while connecting to mongo db", err);

    callback(false);
  }
};

var editPurgeStatToFailed = function (req_id, proxy_ip) {
  //connect away

  if (localConObj && localConObj != null) {
    var collection = localConObj.collection(settings.local_mongo.purge_jobs_collection);

    if (collection) {
      collection.findOne({
        req_id: req_id
      }, function (err, purgeDet) {
        if (err) {
          //db.close();
          console.log(Date() + " : editPurgeStatToFailed() - Error while getting purge details by req_id", err);
        } else {
          //var stat="";
          var retry_proxy_list = purgeDet.retry_proxy_list;

          //if(req_status=="pending") {
          var parr = [];
          var proxy_fcount = purgeDet.proxy_fail_count;
          if (retry_proxy_list != "") {
            parr = retry_proxy_list.split(",");
            if (parr.indexOf(proxy_ip.toLowerCase()) == -1) {
              parr.push(proxy_ip.toLowerCase());
              retry_proxy_list = parr.join(",");
              proxy_fcount = proxy_fcount + 1;
            }
          } else {
            parr[0] = proxy_ip.toLowerCase();
            retry_proxy_list = parr.join(",");
            proxy_fcount = proxy_fcount + 1;
          }

          var proxyArr = purgeDet.proxy_list.split(",");
          var proxy_scount = purgeDet.proxy_suc_count;

          var stat = purgeDet.req_status;

          if ((proxy_scount + proxy_fcount) == proxyArr.length) {
            stat = "failed";
          }

          collection.update({
            req_id: req_id
          }, {
            $set: {
              retry_proxy_list: retry_proxy_list,
              req_status: stat,
              proxy_fail_count: proxy_fcount
            }
          }, function (err, purgeDet) {
            if (err) {
              console.log(Date() + " : editPurgeStatToFailed() - Error while updating purge details");
            }
            //db.close();
          });
        }
      });
    } else {
      console.log(Date() + " : editPurgeStatToFailed() - Error while getting db object");

      //db.close();
    }
    //});
  } else {
    console.log(Date() + " : editPurgeStatToFailed() - Error while connecting to mongo db", err);
  }
};

var editPurgeStatToSuccess = function (req_id, proxy_ip) {
  //connect away
  if (localConObj && localConObj != null) {
    var collection = localConObj.collection(settings.local_mongo.purge_jobs_collection);

    if (collection) {
      collection.findOne({
        req_id: req_id
      }, function (err, purgeDet) {
        if (err) {
          //db.close();
          console.log(Date() + " : editPurgeStatToSuccess() - Error while getting purge details by req_id", err);
        } else {
          if (purgeDet) {
            //var stat="";
            var retry_proxy_list = purgeDet.retry_proxy_list;
            var proxy_fcount = purgeDet.proxy_fail_count;

            if (retry_proxy_list != "" && retry_proxy_list != undefined) {
              var parr = retry_proxy_list.split(",");
              var ind = parr.indexOf(proxy_ip.toLowerCase());

              if (ind != -1) {
                proxy_fcount = proxy_fcount - 1;
                parr.splice(ind, 1);
              }
              retry_proxy_list = parr.join(",");
            }

            //for maintaining proxy success count
            var proxy_suc_list = purgeDet.proxy_suc_list;

            //if(proxy_suc_list!="" && proxy_suc_list !=undefined) {
            var psucarr = proxy_suc_list.split(",");
            var ind = psucarr.indexOf(proxy_ip.toLowerCase());

            //if(ind==-1) {
            if (proxy_suc_list == "") {
              psucarr[0] = proxy_ip.toLowerCase();
            } else {
              psucarr.push(proxy_ip.toLowerCase());
            }
            //}
            proxy_suc_list = psucarr.join(",");
            //}

            var stat = purgeDet.req_status;

            var proxyArr = purgeDet.proxy_list.split(",");
            var proxy_scount = purgeDet.proxy_suc_count + 1;

            //console.log("RET AFT", retry_proxy_list);

            if (retry_proxy_list == "" && proxy_scount >= proxyArr.length) {
              proxy_fcount = 0;
              proxy_scount = proxyArr.length;
              stat = "success";
            } else if ((proxy_scount + proxy_fcount) == proxyArr.length) {
              stat = "failed";
            }

            //console.log("SUCCESS COUNT",proxy_scount, "PROXY ARR",proxyArr.length,"STATUS",stat);

            collection.update({
              req_id: req_id
            }, {
              $set: {
                retry_proxy_list: retry_proxy_list,
                req_status: stat,
                proxy_suc_count: proxy_scount,
                proxy_fail_count: proxy_fcount,
                proxy_suc_list: proxy_suc_list
              }
            }, function (err, purgeDet) {
              if (err) {
                console.log(Date() + " : editPurgeStatToSuccess() - Error while updating purge details");
              }
              //db.close();
            });
          }
        }
      });
    } else {
      console.log(Date() + " : editPurgeStatToSuccess() - Error while getting db object");

      //db.close();
    }
    //});
  } else {
    console.log(Date() + " : editPurgeStatToSuccess() - Error while connecting to mongo db", err);
  }
};

var editFailedPurgeStatus = function (req_id, successBPS, failureBPS, callback) {
  //console.log("Calling editFailedPurgeStatus");
  //connect away
  if (localConObj && localConObj != null) {
    var collection = localConObj.collection(settings.local_mongo.purge_jobs_collection);
    if (collection) {
      //collection.findOne({req_id: req_id},function(err, purgeDet) {
      collection.find({
        req_id: req_id
      }).sort({
        $natural: 1
      }).limit(1).toArray(function (err, purgeDet) {
        if (err) {
          console.log(Date() + " : editFailedPurgeStatus() - Error while getting purge details by req_id", req_id);
        } else {
          if (purgeDet) {
            //console.log("successBPS",successBPS,"Failed BPS",failureBPS);

            if (successBPS.length > 0) {
              purgeDet = purgeDet[0];
              var proxy_suc_list = purgeDet.proxy_suc_list;
              var success_proxy_count = purgeDet.proxy_suc_count;

              var retry_proxy_count = failureBPS.length;
              var retry_proxy_list = "";

              var status = "success";
              if (successBPS != "" && successBPS != undefined && successBPS.length > 0) {
                //setting success proxy count and joining success proxies
                //console.log("proxy_suc_list",proxy_suc_list);
                var parr = [];
                if (proxy_suc_list != "") {
                  parr = proxy_suc_list.split(",");
                  for (var i = 0; i < successBPS.length; i++) {
                    if (parr.indexOf(successBPS[i].toLowerCase()) == -1) {
                      parr.push(successBPS[i].toLowerCase());
                    }
                  };
                  success_proxy_count = parr.length;
                  proxy_suc_list = parr.join(",").toLowerCase();
                } else {
                  success_proxy_count = successBPS.length;
                  proxy_suc_list = successBPS.join(",").toLowerCase();
                }
              }

              if (failureBPS.length > 0) {
                status = "failed";
                retry_proxy_list = failureBPS.join(",").toLowerCase();
              }

              collection.update({
                req_id: req_id
              }, {
                $set: {
                  retry_proxy_list: retry_proxy_list,
                  req_status: status,
                  proxy_suc_count: success_proxy_count,
                  proxy_fail_count: retry_proxy_count,
                  proxy_suc_list: proxy_suc_list
                }
              }, function (err, purgeDet) {
                if (err) {
                  console.log(Date() + " : editFailedPurgeStatus() - Error while updating purge details for ", req_id);
                }
                callback(true);
              });
            }
          } else {
            callback(true);
            console.log(Date() + "unable to find request with id:", req_id);
          }
        }
      });
    } else {
      callback(true);
      console.log(Date() + " : editFailedPurgeStatus() - Error while getting db object", req_id);
    }
  } else {
    callback(true);
    console.log(Date() + " : editFailedPurgeStatus() - Error while connecting to mongo db", req_id);
  }
};

var editPurgeStatus = function (req_id, successBPS, failureBPS, clb) {
  //connect away
  //console.log("Calling editPurgeStatus() ");
  if (localConObj && localConObj != null) {
    var collection = localConObj.collection(settings.local_mongo.purge_jobs_collection);
    if (collection) {
      //collection.findOne({req_id: req_id},function(err, purgeDet) {
      collection.find({
        req_id: req_id
      }).sort({
        $natural: 1
      }).limit(1).toArray(function (err, purgeDet) {
        if (err) {
          console.log(Date() + " : editPurgeStatus() - Error while getting purge details by req_id", req_id);
        } else {
          if (purgeDet) {
            if (successBPS.length > 0 || failureBPS.length > 0) {
              var retry_proxy_list = "",
                proxy_suc_list = "";
              var retry_proxy_count = 0,
                success_proxy_count = 0;
              var status = "success";
              if (failureBPS != "" && failureBPS != undefined) {
                //setting failed proxy count and joining failed proxies
                retry_proxy_count = failureBPS.length;
                retry_proxy_list = failureBPS.join(",").toLowerCase();
              }
              if (successBPS != "" && successBPS != undefined) {
                //setting success proxy count and joining success proxies
                success_proxy_count = successBPS.length;
                proxy_suc_list = successBPS.join(",").toLowerCase();
              }

              if (failureBPS.length > 0) {
                status = "failed"
              }
              collection.update({
                req_id: req_id
              }, {
                $set: {
                  retry_proxy_list: retry_proxy_list,
                  req_status: status,
                  proxy_suc_count: success_proxy_count,
                  proxy_fail_count: retry_proxy_count,
                  proxy_suc_list: proxy_suc_list
                }
              }, function (err, purgeDet) {
                if (err) {
                  console.log(Date() + " : editPurgeStatus() - Error while updating purge details for ", req_id);
                }
                clb(true);
              });
            }
          } else {
            clb(true);
            console.log(Date() + "unable to find request with id:", req_id);
          }
        }
      });
    } else {
      clb(true);
      console.log(Date() + " : editPurgeStatus() - Error while getting db object", req_id);
    }
  } else {
    clb(true);
    console.log(Date() + " : editPurgeStatus() - Error while connecting to mongo db", req_id);
  }
};

function sendPurgeJsonToFailedProxyListWs(reqId, purgeUrls, purgeWSJson, reqStatus, callback) {
  //console.log("Calling sendPurgeJsonToFailedProxyListWs");
  editPurgeStatFromFailedToInProgress(reqId, function (checkReqStat) {
    if (checkReqStat) {
      var purgeArray = new Array();
      purgeArray = purgeUrls.split(",");
      var ip = 0;

      var failureBPS = new Array();
      var successBPS = new Array();
      var totalResponses = 0;

      purgeWS();

      function purgeWS() {
        if (ip < purgeArray.length) {
          if (purgeArray[ip].toString()) {
            var wsUrl = "ws://" + purgeArray[ip] + ":8002";
            console.log(Date() + " : sendPurgeJsonToFailedProxyListWs() - Sending Json to ", wsUrl, " for the domain ", purgeWSJson.purges[0].url.domain, " Request Id", reqId);

            var client = new WebSocketClient();
            client.connect(wsUrl, 'collector-bridge');

            client.on('connectFailed', function (error) {
              console.log(Date() + " : sendPurgeJsonToFailedProxyListWs() - Connect Failed to Policy ", wsUrl);

              //timer to close the connection
              setInterval(function () {
                if (connection) connection.close();
              }, 60000);

              //if(reqStatus=="pending") {
              //editPurgeStatToFailed(reqId, purgeArray[ip]);
              failureBPS.push(purgeArray[ip]);

              totalResponses++;
              //}
              ip++;
              purgeWS();
            });

            client.on("connect", function (connection) {

              if (connection.connected) {
                connection.send(JSON.stringify(purgeWSJson));
                // If Connected Start the next process imediately with out waiting for theresponse
                ip++;
                purgeWS();
              } else {
                console.log(Date() + " : sendPurgeJsonToFailedProxyListWs() - Connection not established to Policy ", wsUrl);

                //editPurgeStatToFailed(reqId,purgeArray[ip]);
                failureBPS.push(purgeArray[ip]);

                totalResponses++;

                ip++;
                purgeWS();
                //timer to close the connection
                setInterval(function () {
                  if (connection) connection.close();
                }, 60000);
              }

              connection.on("error", function (error) {
                console.log(Date() + " : sendPurgeJsonToFailedProxyListWs() - Connect Error while connecting to Policy ", wsUrl);

                //if(reqStatus=="pending") {
                //editPurgeStatToFailed(reqId, purgeArray[ip]);
                //}
                failureBPS.push(purgeArray[ip]);

                totalResponses++;

                ip++;
                purgeWS();
                //timer to close the connection
                setInterval(function () {
                  if (connection) connection.close();
                }, 60000);
              });

              connection.on('message', function (message) {
                //console.log(message.utf8Data,typeof message.utf8Data);
                revlogger.log('debug', "Response From Policy : " + JSON.stringify(message));

                totalResponses++;

                if (message && message.utf8Data && typeof message.utf8Data == "string" && JSON.parse(message.utf8Data).status && JSON.parse(message.utf8Data).status == "success") {
                  //console.log("PROX IP",JSON.parse(message.utf8Data).host_name);
                  //console.log(Date()+ " : sendPurgeJsonToProxyListWs() - Policy returned with failed status for req id --", JSON.parse(message.utf8Data).req_id, "host name", JSON.parse(message.utf8Data).host_name);
                  successBPS.push(JSON.parse(message.utf8Data).host_name);
                  //editPurgeStatToSuccess(JSON.parse(message.utf8Data).req_id, JSON.parse(message.utf8Data).host_name);
                } else {
                  console.log(Date() + " : sendPurgeJsonToFailedProxyListWs() - Policy returned with failed status for req id --", JSON.parse(message.utf8Data).req_id, "host name", JSON.parse(message.utf8Data).host_name);
                  failureBPS.push(JSON.parse(message.utf8Data).host_name);

                  //editPurgeStatToFailed(JSON.parse(message.utf8Data).req_id, JSON.parse(message.utf8Data).host_name);
                }
                ip++;
                purgeWS();

                setInterval(function () {
                  if (connection) connection.close();
                }, 60000);
              });
              connection.on('close', function () {
                //console.log('Websocket Connection Closed');
              });
            });
          }
        } else {
          //console.log("PURGE PROCESS COMPLETED");

          if (totalResponses == purgeArray.length) {
            editFailedPurgeStatus(reqId, successBPS, failureBPS, function (updSat) {
              callback(true);
            });
          }
          //callback(true);
        }
      }
    } else {
      callback(true);
    }
  });
};

function sendPurgeJsonToProxyListWs(reqId, purgeUrls, purgeWSJson, reqStatus, callback) {
  //console.log("Calling sendPurgeJsonToProxyListWs");
  editPurgeStatToInProgress(reqId, function (checkReqStat) {
    if (checkReqStat) {
      var purgeArray = new Array();
      purgeArray = purgeUrls.split(",");
      var ip = 0;

      var failureBPS = new Array();
      var successBPS = new Array();
      var totalResponses = 0;

      purgeWS();

      function purgeWS() {
        if (ip < purgeArray.length) {
          if (purgeArray[ip].toString()) {
            var wsUrl = "ws://" + purgeArray[ip] + ":8002";
            revlogger.log('debug', 'sendPurgeJsonToProxyListWs() - Sending Json to '+  wsUrl + ' for the domain ' + purgeWSJson.purges[0].url.domain + ', request Id: ' + reqId);

            var client = new WebSocketClient();
            client.connect(wsUrl, 'collector-bridge');

            client.on('connectFailed', function (error) {
              console.log(Date() + " : sendPurgeJsonToProxyListWs() - Connect Failed to Policy ", wsUrl);

              //timer to close the connection
              setInterval(function () {
                if (connection) connection.close();
              }, 60000);

              //if(reqStatus=="pending") {
              //editPurgeStatToFailed(reqId, purgeArray[ip]);
              failureBPS.push(purgeArray[ip]);

              totalResponses++;
              //}
              ip++;
              purgeWS();
            });

            client.on("connect", function (connection) {

              if (connection.connected) {
                connection.send(JSON.stringify(purgeWSJson));
                // If Connected Start the next process imediately with out waiting for theresponse
                ip++;
                purgeWS();
              } else {
                console.log(Date() + " : sendPurgeJsonToProxyListWs() - Connection not established to Policy ", wsUrl);

                //editPurgeStatToFailed(reqId,purgeArray[ip]);
                failureBPS.push(purgeArray[ip]);

                totalResponses++;

                ip++;
                purgeWS();
                //timer to close the connection
                setInterval(function () {
                  if (connection) connection.close();
                }, 60000);
              }

              connection.on("error", function (error) {
                console.log(Date() + " : sendPurgeJsonToProxyListWs() - Connect Error while connecting to Policy ", wsUrl);

                //if(reqStatus=="pending") {
                //editPurgeStatToFailed(reqId, purgeArray[ip]);
                //}
                failureBPS.push(purgeArray[ip]);

                totalResponses++;

                ip++;
                purgeWS();
                //timer to close the connection
                setInterval(function () {
                  if (connection) connection.close();
                }, 60000);
              });

              connection.on('message', function (message) {
                //console.log(message.utf8Data,typeof message.utf8Data);
                revlogger.log('debug', "Response From Policy : " + JSON.stringify(message));

                totalResponses++;

                if (message && message.utf8Data && typeof message.utf8Data == "string" && JSON.parse(message.utf8Data).status && JSON.parse(message.utf8Data).status == "success") {
                  //console.log("PROX IP",JSON.parse(message.utf8Data).host_name);
                  //console.log(Date()+ " : sendPurgeJsonToProxyListWs() - Policy returned with failed status for req id --", JSON.parse(message.utf8Data).req_id, "host name", JSON.parse(message.utf8Data).host_name);
                  successBPS.push(JSON.parse(message.utf8Data).host_name);
                  //editPurgeStatToSuccess(JSON.parse(message.utf8Data).req_id, JSON.parse(message.utf8Data).host_name);
                } else {
                  console.log(Date() + " : sendPurgeJsonToProxyListWs() - Policy returned with failed status for req id --", JSON.parse(message.utf8Data).req_id, "host name", JSON.parse(message.utf8Data).host_name);
                  failureBPS.push(JSON.parse(message.utf8Data).host_name);

                  //editPurgeStatToFailed(JSON.parse(message.utf8Data).req_id, JSON.parse(message.utf8Data).host_name);
                }
                ip++;
                purgeWS();

                /**if(totalResponses==purgeArray.length)
		 						{
		 							editPurgeStatus(reqId,successBPS,failureBPS,function(updSat) {
										callback(true);
									});
		 						}*/
                setInterval(function () {
                  if (connection) connection.close();
                }, 60000);
              });
              connection.on('close', function () {
                //console.log('Websocket Connection Closed');
              });
            });
          }
        } else {
          if (totalResponses == purgeArray.length) {
            editPurgeStatus(reqId, successBPS, failureBPS, function (updSat) {
              callback(true);
            });
          }
          //callback(true);
        }
      }
    } else {
      callback(true);
    }
  });
};


var run_http_server = function () {
  http.createServer(app).listen(settings.service.http_port, settings.service.url);

  //var io = require('socket.io')(server, {origins:'domain.com:* http://domain.com:* http://www.domain.com:*'});

  revlogger.log('info','Listening on http://' + settings.service.url + ':' + settings.service.http_port);
}

//Creating server which listen port to the given domain or ip
if (settings.is_https != undefined && settings.is_https) {
  var options = {};
  if (settings.key_path != undefined && settings.key_path != '' && settings.cert_path != undefined && settings.cert_path != '' && settings.ca_path != '' && settings.ca_path != undefined) {
    options.key = fs.readFileSync(settings.key_path);
    options.cert = fs.readFileSync(settings.cert_path);
    options.ca = fs.readFileSync(settings.ca_path)
    https.createServer(options, app).listen(settings.service.https_port, settings.service.url);
    run_http_server();
    revlogger.log('info','Listening on https://' + settings.service.url + ':' + settings.service.https_port);
  } else {
    run_http_server();
  }
} else {
  run_http_server();
}

app.get('/checkStatus', function (request, response) {
  response.writeHead(200, {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "*"
  });

  var purgeJson = {};
  purgeJson.status = "404";
  purgeJson.message = "Invalid Request";

  console.log(Date() + ": checkStatus() - Some parameters missed in your curl command");

  console.log("Response", JSON.stringify(purgeJson));

  response.end(JSON.stringify(purgeJson) + '\n');
});

/**app.get('/checkStatus', function(request, response) {
	response.writeHead(200, {"Content-Type": "application/json","Access-Control-Allow-Origin":"*", "Access-Control-Allow-Methods" :"*"});
	
	var purgeJson = {};
	purgeJson.status="404";
	purgeJson.message="Invalid Request";
	console.log("JSON",JSON.stringify(purgeJson));

	response.end(JSON.stringify(purgeJson)+'\n');
}*/

app.post('/checkStatus', function (request, response) {
  revlogger.log('info', 'Processing "checkStatus" request for job ID ' + request.body.req_id);

  response.writeHead(200, {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "*"
  });
  var req_statusObj = {};
  if (request.body.req_id && request.body.req_id != "") {
    getRequestStatus(request.body.req_id, function (status, respObj) {
      req_statusObj.req_id = request.body.req_id;
      if (status != "connectFail" && status != "queryFail" && status != "invalidData") {
        req_statusObj.status = 200;
        if (status == "success") {
          req_statusObj.message = "Purge Successful";
        } else if (status == "failed") {
          //var statMsg = status+"("+ respObj.retry_proxy_list+")";
          req_statusObj.message = "In Progress" // statMsg;
        } else {
          req_statusObj.message = status;
        }
      } else {
        req_statusObj.status = Number(statusMsgObj[status][0]);
        req_statusObj.message = statusMsgObj[status][1];
      }
      response.end(JSON.stringify(req_statusObj) + '\n');
    });
  } else {
    console.log(Date() + ": checkStatus() - Request ID missed in your curl command");

    req_statusObj.status = Number(statusMsgObj["invalidData"][0]);
    req_statusObj.message = statusMsgObj["invalidData"][1];
    response.end(JSON.stringify(req_statusObj) + '\n');
  }
});

function getRequestStatus(req_req_id, callback) {
  if (localConObj && localConObj != null) {
    var collection_new = localConObj.collection(settings.local_mongo.purge_jobs_collection);
    if (collection_new) {
      collection_new.findOne({
        req_id: req_req_id
      }, function (err, reqObj) {
        if (err) {
          //db.close();
          callback("queryFail", "");
          console.log(Date() + " : getRequestStatus() - Error while getting purge details by req_id", err);

        } else {
          //db.close();
          if (reqObj) {
            callback(reqObj.req_status, reqObj);
          } else {
            console.log(Date() + " : getRequestStatus() - In valid Request ID");

            callback("invalidData", "");
          }
        }
      });
    } else {
      console.log(Date() + " : getRequestStatus() - Error while getting db object");

      //db.close();
      callback("connectFail", "");
    }
    //});
  } else {
    callback("connectFail", "");
    console.log(Date() + " : getRequestStatus() - Error while connecting to mongo db", err);
  }
}

/* Process health check requests */

app.get('/healthcheck', function (request, response) {

  var user_ip = "";
  var address = forwarded(request, request.headers);

  if (address) {
    user_ip = address.ip;
  }

  revlogger.log('debug', 'Received "/healthcheck" request from user IP ' + user_ip);

  var healthcheckJson = {};
  healthcheckJson.message = '';

  response.writeHead(200, {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "*"
  });

  // Checking the connectivity to the portal MDB service
  if (! portalConObj || portalConObj === null) {
    healthcheckJson.message = healthcheckJson.message + 'ERROR: The portal MDB connection object does not exist';

  } else {
    var collection_usr = portalConObj.collection(settings.portal_mongo.user_collection);

    collection_usr.findOne({}, function (err, userDet) {
      if (err) {
        revlogger.log('error', 'Failed to fetch a record from the portal MDB during a healthcheck request, error: ' + err);
        healthcheckJson.message = healthcheckJson.message + 'ERROR: Failed to fetch a record from the portal MDB';
      } else {
        revlogger.log('debug', 'Portal MDB healthcheck call is OK'); 
        healthcheckJson.message = healthcheckJson.message + 'INFO: Portal MDB healthcheck call is OK';
      };
      healthcheckJson.status = "200";
      revlogger.log('debug','healthcheck resonse JSON: ' + JSON.stringify(healthcheckJson));
      response.end(JSON.stringify(healthcheckJson) + '\n');
    });
  };
});

