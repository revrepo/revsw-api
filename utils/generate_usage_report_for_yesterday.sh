#!/bin/bash
#
# The script should be executed once a day only on ONE server in an environment.
#
# Configure it as the following in /etc/crontab:
#
#     # Run daily usage stats collection script
#     3 1 * * * root /usr/local/bin/lockrun --lockfile=/var/tmp/run_usage_report.lockrun -- /opt/revsw-api/utils/generate_usage_report_for_yesterday.sh
#

CONFIG_FILE=/etc/default/revsw-api

if [ -f $CONFIG_FILE ]; then
  . $CONFIG_FILE
fi

API_DIR=/opt/revsw-api

if [ -d $API_DIR ]; then
  cd $API_DIR
fi

nodejs --expose-gc utils/usage_report.js --date -12h --CLI_MODE
