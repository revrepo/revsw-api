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

var mongoose = require('mongoose');
var config = require('config');
var mongoConnection = require('./../lib/mongoConnections');
var Account = require('../models/Account');
var accounts = new Account(mongoose, mongoConnection.getConnectionPortal());
var User = require('../models/User');
var users = new User(mongoose, mongoConnection.getConnectionPortal());
var accountService = require('../services/accounts.js');
var Promise = require('bluebird');
mongoose.set('debug', false);

var dryRun = false;

function printHelp() {
    console.log(' --- Account Migration Script --- ');
    console.log('');
    console.log('');
    console.log(' > Args:');
    console.log(' >>> -d, -dry, -dryrun, --d, --dryrun, --dry:');
    console.log(' >>> Dryrun mode, no data will be updated, only info will be displayed.');
    console.log('');
    console.log('');
    console.log(' >>> -h, -help, --h, --help:');
    console.log(' >>> Display this help info');
}

process.argv.forEach(function (val, index, array) {
    switch (val) {
        case '-d':
        case '-dry':
        case '-dryrun':
        case '--d':
        case '--dryrun':
        case '--dry':
            // dry run, dont save anything..
            dryRun = true;
            console.log(' --- Dryrun Mode is On ---');
            break;
        case '-h':
        case '-help':
        case '--h':
        case '--help':
            printHelp();
            process.exit();
            break;
    }
});

users.model.find({}, function (err, usrs) {
    if (err) {
        throw new Error(err);
    } else if (usrs) {
        for (var i = 0; i < usrs.length; i++) {
            var user = usrs[i];
            if (user.role === 'reseller') {
                // if the user is reseller
                if (user.companyId && user.companyId.includes(',')) {
                    console.log('User: ' + user.email);
                    console.log('User`s companyId: ' + user.companyId);
                    // if the user has multiple IDs in the companyId field
                    // split up the ids and make an array
                    var accountArray = user.companyId.split(',');
                    // the first ID is the 'parent' id, save it to a var
                    var parentAccount = accountArray[0];
                    // remove the first 'parent' id from the array, we dont need to change it..
                    accountArray = accountArray.splice(1, accountArray.length - 1);
                    for (var j = 0; j < accountArray.length; j++) {
                        var account = accountArray[j];

                        // go through the array of IDs and set the new parent ID
                        updateAccount(account, parentAccount);
                    }
                }
            }
        }
    }
});

var updateAccount = function (id, parentID) {
    var flaggie = true;
    accounts.list(function (err, accs) {
        // This check tests all accounts in the DB to see if any of them have current id (from funciton param)
        // set as their parent_account_id, if a case is found, we dont update that account, we display an error
        // and need to manually fix it.
        accs.forEach(function (testAccount) {
            if (testAccount.parent_account_id === id) {
                console.log('Account with ID `' + id + '` can\'t have a parent account because it is a parent account already.');
                flaggie = false;
            }
        });
        if (flaggie) {
            accounts.get({ _id: parentID }, function (error, parentAccount) {
                if (error) {
                    throw new Error(error);
                } else if (parentAccount) {
                    // This 
                    if (parentAccount.parent_account_id) {
                        console.log('Error related >>>> `' + id + '` Is the account ID we are trying to update.');
                        throw new Error('Account with ID `' + parentAccount.id + '` can\'t be a Parent account because it has a Parent account.');
                    }
                    accounts.get({ _id: id }, function (error, acc) {
                        if (error) {
                            throw new Error(error);
                        } else if (acc) {
                            if (acc.parent_account_id && acc.parent_account_id !== parentID) {
                                console.log('Account ID `' + acc.id + '` already has a parent account!');
                                console.log('Current: `' + acc.parent_account_id + '`; New one: `' + parentID + '`');
                            } else {
                                // if the account already has a parent ID, leave it as is
                                acc.parent_account_id = acc.parent_account_id || parentID;
                                acc.account_id = acc.id;

                                // run save function to save acc with new parent id
                                if (!dryRun) {
                                    accounts.update(acc, function (saveError, item) {
                                        if (saveError) {
                                            throw new Error(saveError);
                                        } else if (item) {
                                            console.log('Account `' + item.id + '` parent ID is set to: `' + item.parent_account_id + '`!');
                                        } else {
                                            console.log('Cannot update account: `' + id + '`');
                                        }
                                    });
                                } else {
                                    console.log('Dryrun mode is on, not updating any objects, only displaying info.');
                                    console.log('Account `' + item.id + '` parent ID is set to: `' + item.parent_account_id + '`!');
                                }
                            }
                        } else {
                            console.log('Cannot get account: `' + id + '`');
                        }
                    });
                }
            });
        }
    });
};