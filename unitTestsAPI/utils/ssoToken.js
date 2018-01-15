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

'use strict';

var Promise = require('bluebird');
var crypto = require('crypto');
var ursa = require('ursa');
var Fs = require('fs');
var config = require('config');
var zlib = require('zlib');
var utils = require('./../../lib/utilities');
var vendorProfileList = config.get('vendor_profiles');
var azureMarketplace = vendorProfileList.revapm.azure_marketplace;

// This private key will be used to sign the SSO token
var key = ursa.createPrivateKey(Fs.readFileSync(config.get('azure_marketplace.sso_private_key')));
// This public key will be used to encrypt the SSO token
var pubkey = ursa.createPublicKey(Fs.readFileSync(config.get('azure_marketplace.sso_public_key')));

module.exports = {

    encryptAppToken: function (appToken, resource) {
        return new Promise(function (resolve, reject) {
            var appTokenString = JSON.stringify(appToken);

            // These two values will be used in symmetric enryption of the appToken
            var sharedSecret = crypto.randomBytes(32);
            var initializationVector = crypto.randomBytes(16);

            var encryptedAppToken = '';
            var cipher = crypto.Cipheriv('aes-256-cbc', sharedSecret, initializationVector);
            encryptedAppToken += cipher.update(appTokenString, 'utf8', 'base64');
            encryptedAppToken += cipher.final('base64');

            // Signing the appToken
            var appTokenSigned = key.hashAndSign('sha256', appTokenString, 'utf8', 'base64');

            // Now let's create a token with the symmetric and IV keys 
            // and encrypt them with the public key
            var secretToken = {
                symmetricKey: sharedSecret.toString('base64'),
                iv: initializationVector.toString('base64')
            };
            var secretTokenString = JSON.stringify(secretToken);

            // Encrypting the secretTokenString object with the public key
            var secretTokenEncrypted = pubkey.encrypt(secretTokenString, 'utf8', 'base64');

            // Now let's prepare a token which  later will be encrypted using the public key
            var token = {
                signedHash: appTokenSigned,
                encryptedData: encryptedAppToken,
                secretToken: secretTokenEncrypted
            };

            var tokenString = JSON.stringify(token);

            // Now let's compress the token
            zlib.gzip(tokenString, function (error, tokenCompressed) {
                // Also need to compress the resourceId string
                zlib.gzip(JSON.stringify(resource.resource_id),
                    function (error, resourceIdCompressed) {
                        if (error) {
                            reject(error);
                        }
                        // Now let's URL-encode the compressed token
                        var tokenEncoded = utils.webURLEncoding(tokenString);

                        // URL-encoding the compressed resourceId string
                        var resourceEncoded = utils.webURLEncoding(resourceIdCompressed);

                        var response = {
                            'url': azureMarketplace.sso_endpoint,
                            'resourceId': resourceEncoded,
                            'token': tokenEncoded
                        };

                        resolve(response);
                    });
            });
        });
    }
};
