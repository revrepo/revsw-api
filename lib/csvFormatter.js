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
const moment = require('moment');
const Promise = require('bluebird');
const CSVREPORT_METRICS = require('./jsons/csvReportMetrics');

const CSVREPORT_FIELDS_NAME = ['"Account ID"',
    '"Company Name"',
    '"Object Type"',
    '"Object ID"',
    '"Object Name"',
    '"Metric Code ID"',
    '"Metric Description"',
    '"Metric Value"',
    '"Metric Unit"',
    '"Billing Period Start Date"',
    '"Billing Period End Date"'];

class CSVLine {
    constructor(account_id,
        companyName,
        objectType,
        objectId,
        objectName,
        MetricCodeId,
        MetricDesc,
        MetricValue,
        MetricUnit,
        from,
        to) {

        this.account_id = account_id;
        this.companyName = companyName;
        this.objectType = account_id === objectId ? '' : objectType;
        this.objectId = account_id === objectId ? '' : objectId;
        this.objectName = companyName === objectName ? '' : objectName;
        this.metricValue = MetricValue;
        this.metricUnit = MetricUnit;
        this.from = from;
        this.to = to;

        const newMetric = this.formatMetric(MetricDesc);

        if (!newMetric) {
            this.skipLine();
        } else {
            this.metricCodeId = newMetric ? newMetric.id : MetricCodeId;
            this.metricDesc = newMetric ? newMetric.desc : MetricDesc;
        }

    }

    skipLine() {
        this.skip = true;
        return false;
    }

    getSkip() {
        return this.skip;
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
            metricUnit: this.metricUnit,
            from: this.from,
            to: this.to
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
            '"' + this.from + '"',
            '"' + this.to + '"'
        ].toString();
    }

    formatMetric(desc) {
        var metric = CSVREPORT_METRICS.find((el) => {
            return el.metric_field === desc;
        });
        if (metric) {
            return {
                id: metric.metric_id,
                desc: metric.metric_desc
            };
        } else {
            return null;
        }
    }
}

class CSVReport {

    constructor() {
        this.report = CSVREPORT_FIELDS_NAME.toString();
    }

    getReport() {
        return this.report.replace(/"null"/g, '');
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
            } else if (desc[i - 1] === ' ' || desc[i - 1] === '-' || desc[i - 1] === '_' || desc[i - 1] === '.') {
                newDesc.push(desc[i].toUpperCase());
            } else {
                switch (desc[i]) {
                    case '_':
                    case '-':
                    case ' ':
                    case '.':
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
        if (!line.getSkip()) {
            let newReport = this.getReport();
            newReport += '\n';
            line.setMetricDesc(line.getMetricDesc());
            newReport += line.toString();
            this.setReport(newReport);
        }
    }
}

const CSVFormatter = {

    formatUsageReport(reports) {
        /** 
         * Ignore this function for now
         * TODO: tidy up function.
         */
        /* jshint ignore:start */
        return new Promise((resolve, reject) => {
            let metadata = reports.metadata;
            reports = reports.data;
            let fromDate = moment(metadata.from).format('MM/DD/YYYY');
            let toDate = moment(metadata.to).format('MM/DD/YYYY');
            let csvReports = [];
            let domainsList = [];
            domains.list(function (err, _domainsList) {
                domainsList = _domainsList;
                reports.forEach(function (report) {
                    if (report.account_id.indexOf('_SUMMARY')) {
                        report.account_id = report.account_id.replace('_SUMMARY', '');
                    }
                    const account = {
                        companyName: '',
                        id: report.account_id
                    };
                    delete report.account_id;
                    delete report.domains.list;
                    delete report.dns_usage;
                    const domainUsage = report.domains_usage;
                    domainsList.forEach(function (dom_) {
                        dom_ = dom_._doc;
                        for (var domName_ in domainUsage) {
                            if (dom_.domain_name === domName_) {
                                domainUsage[domName_]._id = dom_._id.toString();
                            }

                            if (dom_.proxy_config.domain_aliases &&
                                dom_.proxy_config.domain_aliases.length > 0 &&
                                dom_.proxy_config.domain_aliases.indexOf(domName_) !== -1) {
                                domainUsage[domName_]._id = 'Aliases of Domain ID ' + dom_._id.toString();
                            }
                        }
                    });
                    delete report.domains_usage;
                    let reportAccounts;
                    if (report.accounts) {
                        reportAccounts = report.accounts;
                        delete report.accounts;
                    }
                    let csvReport = new CSVReport();
                    if (!report) {
                        return reject('Cannot format an empty report');
                    }

                    if (account.id === 'OVERALL') {
                        account.companyName = 'All Accounts';
                    }

                    accounts.get({
                        _id: account.id
                    }, (error, result) => {
                        if (error && account.id !== 'OVERALL') {
                            return reject(error);
                        }

                        if (account.id !== 'OVERALL') {
                            account.companyName = result.companyName;
                        }

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
                                                key + '.' + subKey + '.' + secSubKey,
                                                report[key][subKey][secSubKey],
                                                setMetricUnit(secSubKey),
                                                fromDate,
                                                toDate
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
                                            key + '.' + subKey,
                                            report[key][subKey],
                                            setMetricUnit(subKey),
                                            fromDate,
                                            toDate
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
                                    setMetricUnit(key),
                                    fromDate,
                                    toDate
                                );
                                csvReport.addLine(newLine);
                            }
                            i++;
                        }

                        if (reportAccounts) {
                            reportAccounts.forEach(function (acc) {
                                for (let key in acc) {
                                    let newLine = new CSVLine(
                                        acc.acc_id,
                                        acc.acc_name,
                                        'Account',
                                        acc.acc_id,
                                        acc.acc_name,
                                        i,
                                        key,
                                        acc[key],
                                        setMetricUnit(key),
                                        fromDate,
                                        toDate
                                    );
                                    csvReport.addLine(newLine);
                                    i++;
                                }
                            });
                        }

                        for (let domain in domainUsage) {
                            for (let key in domainUsage[domain]) {
                                if (!domainUsage[domain]._id) {
                                    domainUsage[domain]._id = 'Deleted';
                                }
                                if (typeof domainUsage[domain][key] === 'object') {
                                    for (let subKey in domainUsage[domain][key]) {
                                        if (typeof domainUsage[domain][key][subKey] === 'object') {
                                            for (let subSubKey in domainUsage[domain][key][subKey]) {
                                                let newLine = new CSVLine(
                                                    account.id,
                                                    account.companyName,
                                                    'Domain',
                                                    domainUsage[domain]._id,
                                                    domain,
                                                    i,
                                                    key + '.' + subKey + '.' + subSubKey,
                                                    domainUsage[domain][key][subKey][subSubKey],
                                                    setMetricUnit(subSubKey),
                                                    fromDate,
                                                    toDate
                                                );
                                                csvReport.addLine(newLine);
                                                i++;
                                            }
                                        } else {
                                            let newLine = new CSVLine(
                                                account.id,
                                                account.companyName,
                                                'Domain',
                                                domainUsage[domain]._id,
                                                domain,
                                                i,
                                                key + '.' + subKey,
                                                domainUsage[domain][key][subKey],
                                                setMetricUnit(subKey),
                                                fromDate,
                                                toDate
                                            );
                                            csvReport.addLine(newLine);
                                            i++;
                                        }
                                    }
                                } else if (key !== '_id') {
                                    let newLine = new CSVLine(
                                        account.id,
                                        account.companyName,
                                        'Domain',
                                        domainUsage[domain]._id,
                                        domain,
                                        i,
                                        key,
                                        domainUsage[domain][key],
                                        setMetricUnit(key),
                                        fromDate,
                                        toDate
                                    );
                                    csvReport.addLine(newLine);
                                    i++;
                                }
                            }
                        }

                        csvReports.push(csvReport.getReport());
                        if (csvReports.length === reports.length) {
                            return resolve(csvReports);
                        }
                    });
                });
            });
        });
        /* jshint ignore:end */
    }
};

function setMetricUnit(key) {
    if (key.includes('bytes')) {
        return 'Bytes';
    } else if (key.includes('bps')) {
        return 'Bps';
    } else {
        return '';
    }
}

module.exports = CSVFormatter;