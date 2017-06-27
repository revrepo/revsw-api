#!/bin/bash
#
# The script should be executed once a day only on ONE server in an environment.
#
# Configure it as the following in /etc/crontab:
#
#     # Run daily job to submit usage reports to Chargify
#     3 3 * * * root /usr/local/bin/lockrun --lockfile=/var/tmp/submit_billing_report.lockrun -- /opt/revsw-api/utils/submit_chargify_billing_report_for_yesterday.sh
#

CONFIG_FILE=/etc/default/revsw-api

if [ -f $CONFIG_FILE ]; then
  . $CONFIG_FILE
fi

API_DIR=/opt/revsw-api

if [ -d $API_DIR ]; then
  cd $API_DIR
fi

nodejs utils/push_usage_data_to_the_billing_system.js --date -12h --CLI_MODE
