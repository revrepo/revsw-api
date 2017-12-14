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

var Locators = {
    header: {
        id: 'header',
        authViaDropdown: {
            id: 'authType'
        },
        apiKeyInput: {
            id: 'input_api_key'
        },
        authBtn: {
            id: 'authBtn'
        },
        logoutBtn: {
            id: 'resetBtn'
        },
        userInput: {
            id: 'input_user',
            css: '#input_user'
        },
        passInput: {
            id: 'input_pass'
        }
    },
    wrapper: {
        class: 'wrapper'
    },
    title: {
        id: 'readme'
    },
    api: {
        title: {
            class: 'api-title'
        },
        container: {
            id: 'swagger'
        },
        resource: {
            class: 'resource',
            resourceTitle: {
                css: '.resource .heading h2 a'
            },
            content: {
                class: 'endpoints'
            },
            endPoints: {
                container: {
                    class: 'endpoints'
                },
                endPoint: {
                    class: 'endpoint',
                    title: {
                        css: '.endpoint .path a'
                    },
                    content: {
                        class: 'content'
                    },
                    submitBtn: {
                        class: 'submit'
                    },
                    response: {
                        responseCode: {
                            css: '.response_code pre'
                        }
                    }
                }
            }
        }
    },
    authMsgs: {
        success: {
            id: 'message',
            css: 'div[id="message"]',
            linkText: 'Authenticated OK' // TODO: use constants.js
        },
        fail: {
            id: 'message',
            css: 'div[id="message"]',
            linkText: 'Authentication Failed!' // TODO: use constants.js
        }
    }
};

module.exports = Locators;
