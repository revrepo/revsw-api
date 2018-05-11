/*************************************************************************
 *
 * REV SOFTWARE CONFIDENTIAL
 *
 * [2013] - [2018] Rev Software, Inc.
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

/**
 * First ES6 File in this project!
 */

//TODO: Add comments to this file and explain everything...

const mongoose = require('mongoose');
const mongoConnection = require('../lib/mongoConnections');
const Account = require('../models/Account');
const accounts = new Account(mongoose, mongoConnection.getConnectionPortal());
const DomainConfig = require('../models/DomainConfig');
const domains = new DomainConfig(mongoose, mongoConnection.getConnectionPortal());

const CSVREPORT_FIELDS_NAME = ['"Account ID"',
    '"Company Name"',
    '"Object Type"',
    '"Object ID"',
    '"Object Name"',
    '"Metric Code ID"',
    '"Metric Description"',
    '"Metric Value"',
    '"Metric Unit"'];

class CSVLine {
    constructor(account_id,
        companyName,
        objectType,
        objectId,
        objectName,
        MetricCodeId,
        MetricDesc,
        MetricValue,
        MetricUnit) {

        this.account_id = account_id;
        this.companyName = companyName;
        this.objectType = objectType;
        this.objectId = objectId;
        this.objectName = objectName;
        this.metricCodeId = MetricCodeId;
        this.metricDesc = MetricDesc;
        this.metricValue = MetricValue;
        this.metricUnit = MetricUnit;

    }

    getLine() {
        return {
            account_id: this.account_id,
            companyName: this.companyName,
            objectType: this.objectType,
            objectId: this.objectId,
            objectName: this.objectName,
            metricCodeId: this.metricCodeId,
            metricDesc: this.metricDesc,
            metricValue: this.metricValue,
            metricUnit: this.metricUnit
        };
    }

    getMetricDesc() {
        return this.metricDesc;
    }

    setMetricDesc(desc) {
        this.metricDesc = desc;
    }

    setMetricUnit(unit) {
        this.metricUnit = unit;
    }

    toString() {
        return [
            '"' + this.account_id + '"',
            '"' + this.companyName + '"',
            '"' + this.objectType + '"',
            '"' + this.objectId + '"',
            '"' + this.objectName + '"',
            '"' + this.metricCodeId + '"',
            '"' + this.metricDesc + '"',
            '"' + this.metricValue + '"',
            '"' + this.metricUnit + '"',
        ].toString();
    }
}

class CSVReport {

    constructor() {
        this.report = CSVREPORT_FIELDS_NAME.toString();
    }

    getReport() {
        return this.report;
    }

    setReport(report) {
        this.report = report;
    }

    getLines() {
        return this.report.split('\n');
    }

    formatMetricDesc(desc) {
        let newDesc = [];
        for (let i = 0; i < desc.length; i++) {
            if (i === 0) {
                newDesc.push(desc[0].toUpperCase());
            } else if (desc[i - 1] === ' ' || desc[i - 1] === '-' || desc[i - 1] === '_') {
                newDesc.push(desc[i].toUpperCase());
            } else {
                switch (desc[i]) {
                    case '_':
                    case '-':
                    case ' ':
                        newDesc.push(' ');
                        break;
                    default:
                        newDesc.push(desc[i]);
                        break;
                }
            }
        }

        return newDesc.join('');
    }

    addLine(line) {
        let newReport = this.getReport();
        newReport += '\n';
        line.setMetricDesc(this.formatMetricDesc(line.getMetricDesc()));
        newReport += line.toString();
        this.setReport(newReport);
    }
}

const CSVFormatter = {

    formatUsageReport(report) {
        return new Promise((resolve, reject) => {
            let domainsList = [];
            if (report.account_id.indexOf('_SUMMARY')) {
                report.account_id = report.account_id.replace('_SUMMARY', '');
            }
            const account = {
                companyName: '',
                id: report.account_id
            };
            delete report.account_id;
            delete report.domains.list;
            const domainUsage = report.domains_usage;
            delete report.domains_usage;
            if (report.dns_usage.length === 0) {
                delete report.dns_usage;
            }
            let csvReport = new CSVReport();
            if (!report) {
                reject('Cannot format an empty report');
            }

            domains.list(function (err, _domainsList) {
                domainsList = _domainsList;
                accounts.get({
                    _id: account.id
                }, (error, result) => {
                    if (error) {
                        reject(error);
                    }

                    account.companyName = result.companyName;
                    let i = 0;
                    for (let key in report) {
                        if (typeof report[key] === 'object') {
                            for (let subKey in report[key]) {
                                if (typeof report[key][subKey] === 'object') {
                                    for (let secSubKey in report[key][subKey]) {
                                        let newLine = new CSVLine(
                                            account.id,
                                            account.companyName,
                                            '',
                                            '',
                                            '',
                                            i,
                                            secSubKey + ' ' + subKey + ' ' + key,
                                            report[key][subKey][secSubKey],
                                            setMetricUnit(secSubKey)
                                        );
                                        csvReport.addLine(newLine);
                                    }
                                } else {
                                    let newLine = new CSVLine(
                                        account.id,
                                        account.companyName,
                                        '',
                                        '',
                                        '',
                                        i,
                                        subKey + ' ' + key,
                                        report[key][subKey],
                                        setMetricUnit(subKey)
                                    );
                                    csvReport.addLine(newLine);
                                }
                            }
                        } else {
                            let newLine = new CSVLine(
                                account.id,
                                account.companyName,
                                '',
                                '',
                                '',
                                i,
                                key,
                                report[key],
                                setMetricUnit(key)
                            );
                            csvReport.addLine(newLine);
                        }
                        i++;
                    }

                    for (let domain in domainUsage) {
                        domainsList.forEach(function (_dom) {
                            _dom = _dom._doc;
                            if (_dom.domain_name === domain) {
                                for (let key in domainUsage[domain]) {
                                    if (typeof domainUsage[domain][key] === 'object') {
                                        for (let subKey in domainUsage[domain][key]) {
                                            let newLine = new CSVLine(
                                                account.id,
                                                account.companyName,
                                                'Domain',
                                                _dom._id,
                                                domain,
                                                i,
                                                subKey + ' ' + key,
                                                domainUsage[domain][key][subKey],
                                                setMetricUnit(subKey)
                                            );
                                            csvReport.addLine(newLine);
                                            i++;
                                        }
                                    } else {
                                        let newLine = new CSVLine(
                                            account.id,
                                            account.companyName,
                                            'Domain',
                                            _dom._id,
                                            domain,
                                            i,
                                            key,
                                            domainUsage[domain][key],
                                            setMetricUnit(key)
                                        );
                                        csvReport.addLine(newLine);
                                        i++;
                                    }
                                }
                            }
                        });
                    }

                    resolve(csvReport.getReport());
                });
            });
        });
    }

};

function setMetricUnit(key) {
    if (key.includes('bytes')) {
        return 'Bytes';
    } else if (key.includes('bps')) {
        return 'Bps';
    } else if (key.includes('count')) {
        return 'Count';
    } else {
        return '';
    }
};

module.exports = CSVFormatter;