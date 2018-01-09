
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
require('should');

process.env.NODE_CONFIG_DIR = '../config';
var chargifyFile = require('./../../handlers/chargify');

/*
    TODO: need to enable test for all types of events to check that chargify handler is fully covered
*/

describe('Unit Test:', function () {
    describe('Chargify', function () {

        var events = [
            'test',
            //'signup_success',
            //'subscription_state_change'
        ];

        var request = {
            payload: {
                event: null
            }   
        };

        events.forEach(function (event) {
            it('should return success message with `' + event + '` event', function (done) {
                request.payload.event = event;
                chargifyFile.webhookHandler(request, function (res) {
                    res.statusCode.should.equal(200);
                    done();
                });
            });
        });

    });
});