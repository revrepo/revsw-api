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

// # Constants

var Constants = {
    SUCCESSFUL_AUTH_MSG: 'Authenticated OK',
    FAIL_AUTH_MSG: 'Authentication Failed!',
    /* API_ENDPOINTS array should be updated every time a new end-point is added to the API. */
    API_ENDPOINTS: [
        '/v1/accounts',
        '/v1/accounts/{account_id}',
        '/v1/activity',
        '/v1/api_keys',
        '/v1/api_keys/myself',
        '/v1/api_keys/{key_id}',
        '/v1/api_keys/{key_id}/activate',
        '/v1/api_keys/{key_id}/deactivate',
        '/v1/apps',
        '/v1/apps/sdk_releases',
        '/v1/apps/{app_id}',
        '/v1/apps/{app_id}/config_status',
        '/v1/apps/{app_id}/versions',
        '/v1/countries/list',
        '/v1/dns_zones',
        '/v1/dns_zones/auto_discover/{zone_name}',
        '/v1/dns_zones/stats/usage',
        '/v1/dns_zones/{dns_zone_id}',
        '/v1/dns_zones/{dns_zone_id}/checkintegration/dns_servers',
        '/v1/dns_zones/{dns_zone_id}/checkintegration/records',
        '/v1/dns_zones/{dns_zone_id}/records',
        '/v1/dns_zones/{dns_zone_id}/records/{dns_zone_record_id}',
        '/v1/dns_zones/{dns_zone_id}/stats/usage',
        '/v1/domain_configs',
        '/v1/domain_configs/{domain_id}',
        '/v1/domain_configs/{domain_id}/check_integration/{check_type}',
        '/v1/domain_configs/{domain_id}/config_status',
        '/v1/domain_configs/{domain_id}/versions',
        '/v1/domain_configs/{domain_id}/waf_rules_list',
        '/v1/locations/billing_zones',
        '/v1/locations/firstmile',
        '/v1/locations/lastmile',
        '/v1/locations/network_ip_blocks',
        '/v1/log_shipping_jobs',
        '/v1/log_shipping_jobs/{log_job_id}',
        '/v1/log_shipping_jobs/{log_job_id}/status',
        '/v1/notification_lists',
        '/v1/notification_lists/{list_id}',
        '/v1/purge',
        '/v1/purge/{request_id}',
        '/v1/ssl_certs',
        '/v1/ssl_certs/{ssl_cert_id}',
        '/v1/ssl_certs/{ssl_cert_id}/config_status',
        '/v1/ssl_conf_profiles',
        '/v1/ssl_names',
        '/v1/ssl_names/approvers',
        '/v1/ssl_names/{ssl_name_id}',
        '/v1/ssl_names/{ssl_name_id}/verify',
        '/v1/staging_servers',
        '/v1/stats/edge_cache/{domain_id}',
        '/v1/stats/fbt/average/{domain_id}',
        '/v1/stats/fbt/distribution/{domain_id}',
        '/v1/stats/fbt/heatmap/{domain_id}',
        '/v1/stats/gbt/{domain_id}',
        '/v1/stats/imageengine/saved_bytes/{domain_id}',
        '/v1/stats/lastmile_rtt/{domain_id}',
        '/v1/stats/lastmile_rtt_histo/{domain_id}',
        '/v1/stats/mobile_desktop/{domain_id}',
        '/v1/stats/sdk/ab/errors',
        '/v1/stats/sdk/ab/fbt',
        '/v1/stats/sdk/ab/fbt_distribution',
        '/v1/stats/sdk/ab/speed',
        '/v1/stats/sdk/account/{account_id}',
        '/v1/stats/sdk/agg_flow',
        '/v1/stats/sdk/app/{app_id}',
        '/v1/stats/sdk/dirs',
        '/v1/stats/sdk/distributions',
        '/v1/stats/sdk/flow',
        '/v1/stats/sdk/top_gbt',
        '/v1/stats/sdk/top_objects',
        '/v1/stats/sdk/top_objects/5xx',
        '/v1/stats/sdk/top_objects/slowest',
        '/v1/stats/sdk/top_requests',
        '/v1/stats/sdk/top_users',
        '/v1/stats/slowest_download_objects/{domain_id}',
        '/v1/stats/slowest_fbt_objects/{domain_id}',
        '/v1/stats/top/{domain_id}',
        '/v1/stats/top_lists/{domain_id}',
        '/v1/stats/top_objects/{domain_id}',
        '/v1/stats/waf/events/{domain_id}',
        '/v1/stats/waf/top/{domain_id}',
        '/v1/stats/waf/top_objects/{domain_id}',
        '/v1/stats/waf/{domain_id}',
        '/v1/stats/{domain_id}',
        '/v1/stats/{domain_id}/activity',
        '/v1/usage_reports/web',
        '/v1/usage_reports/web/stats',
        '/v1/users',
        '/v1/users/myself',
        '/v1/users/password/{user_id}',
        '/v1/users/{user_id}',
        '/v1/waf_rules',
        '/v1/waf_rules/auto_generated_rules',
        '/v1/waf_rules/{waf_rule_id}',
        '/v1/waf_rules/{waf_rule_id}/config_status'
    ]
};
module.exports = Constants;