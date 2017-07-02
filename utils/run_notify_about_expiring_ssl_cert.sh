#!/bin/bash
#
# The script should be executed once a day only on ONE server in an environment.
#
# Configure it as the following in /etc/crontab:
#
#     # Run daily usage stats collection script
#!! TODO: need make correct settings and names
#     3 1 * * * root /usr/local/bin/lockrun --lockfile=/var/tmp/run_notify_about_expiring_ssl_cert.lockrun -- /opt/revsw-api/utils/run_notify_about_expiring_ssl_cert.sh
#

CONFIG_FILE=/etc/default/revsw-api

if [ -f $CONFIG_FILE ]; then
  . $CONFIG_FILE
fi

API_DIR=/opt/revsw-api

if [ -d $API_DIR ]; then
  cd $API_DIR
fi

nodejs --expose-gc utils/usage_report.js --CLI_MODE
