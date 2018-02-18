#!/bin/bash
#
# The script should be executed once a day only on ONE server in an environment.
#
# Configure it as the following in /etc/crontab:
#
#     # Run daily to send notifications about domains traffic changes.
#     # TODO: need to correct time to start !
#     3 3 * * 1 root /usr/local/bin/lockrun --lockfile=/var/tmp/run_notify_about_traffic_changes.lockrun -- /opt/revsw-api/utils/run_notify_about_traffic_changes.sh
#

CONFIG_FILE=/etc/default/revsw-api

if [ -f $CONFIG_FILE ]; then
  . $CONFIG_FILE
fi

API_DIR=/opt/revsw-api

if [ -d $API_DIR ]; then
  cd $API_DIR
fi

nodejs --expose-gc utils/notify_about_traffic_changes.js --CLI_MODE --date -12h --alert_on_traffic_changes --traffic_alerting_email ops@revapm.com
