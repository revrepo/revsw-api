
SCRIPTNAME=$0
PID=$$


API_URL="https://api.revsw.net/purge"
API_CHECKSTATUS_URL="https://api.revsw.net/checkStatus"
API_USER="purge_api_test@revsw.com"
API_PASS="1235wfq345asgasdgasdasda34"
TEST_OBJECT="/test_object_purge_api.js"
TEST_DOMAIN="monitor.revsw.net"
PURGE_TIMEOUT=20
WARNING=7
CRITICAL=12

STATE_OK=0
STATE_WARNING=1
STATE_CRITICAL=2
STATE_UNKNOWN=3
STATE_DEPENDENT=4

function usage () {
cat <<EOF

usage: $0 [ -h ] [ -u API_URL ] [ -s API_CHECKSTATUS_URL ] [ -U API_USER ] [ -p API_PASSWORD ] [ -t TEST_OBJECT_PATH ] \\
            [ -d TEST_OBJECT_DOMAIN ] [ -o PURGE_TIMEOUT ] [ -w WARNING_THRESHOLD ] [ -c CRITICAL_THRESHOLD ]

Available options:
      API_URL             - the URL for Rev API purge command (default value "$API_URL")
      API_CHECKSTATUS_URL - the URL for Rev API CheckStatus comamnd (default value "$API_CHECKSTATUS_URL")
      API_USER            - API user (default value "$API_USER")
      API_PASSWORD        - API password
      TEST_OBJECT_DOMAIN  - the tested domain (default value "$TEST_DOMAIN")
      TEST_OBJECT_PATH    - the tested cacheable object (default value "$TEST_OBJECT")
      PURGE_TIMEOUT       - total timeout allowed for the purge command to complete (default value "$PURGE_TIMEOUT")
      WARNING_THRESHOLD   - Nagios warning threshold for purge operation completion time (default value "$WARNING")
      CRITICAL_THRESHOLD  - Nagios critical threshold for purge operation completion time (default value "$CRITICAL")
EOF
exit 1
}

while getopts "hu:s:U:p:t:d:o:w:c:" OPTION; do
  case "$OPTION" in
    h) usage ;;
    u) API_URL=$OPTARG ;;
    s) API_CHECKSTATUS_URL=$OPTARG ;;
    U) API_USER=$OPTARG ;;
    p) API_PASS=$OPTARG ;;
    t) TEST_OBJECT=$OPTARG ;;
    d) TEST_DOMAIN=$OPTARG ;;
    o) PURGE_TIMEOUT=$OPTARG ;;
    w) WARNING=$OPTARG ;;
    c) CRITICAL=$OPTARG ;;
  esac
done

TEST_URL="http://"${TEST_DOMAIN}${TEST_OBJECT}

function log_message () {
        SEVERITY=$1
        MESSAGE=$2
#         echo `date` "$SCRIPTNAME[$PID]: $SERERITY $MESSAGE"
        logger -t "$SCRIPTNAME[$PID]" $MESSAGE
}

function jsonval {
    temp=`echo $json | sed 's/\\\\\//\//g' | sed 's/[{}]//g' | awk -v k="text" '{n=split($0,a,","); for (i=1; i<=n; i++) print a[i]}' | sed 's/\"\:\"/\|/g' | sed 's/[\,]/ /g' | sed 's/\"//g' | grep -w $prop`
    echo ${temp##*|}
}

function check_url_for_cache_hit () {
        URL_22=$1
        TMP_22=`mktemp`
        curl -s -v $URL_22 > $TMP_22 2>&1
        EXIT_CODE_22=$?
        if [ $EXIT_CODE_22 -ne 0 ]; then
                rm -f $TMP_22
                log_message CRITICAL "Failed to fetch URL $URL_22, curl exit code $EXIT_CODE_22"
                echo "UNKNOWN: Failed to fetch test URL $URL_22, curl exit code $EXIT_CODE_22"
                exit $STATE_UNKNOWN
        fi
        cat $TMP_22 | grep '< X-Rev-Cache: HIT' > /dev/null
        EXIT_CODE_22=$?
        rm -f $TMP_22
        if [ $EXIT_CODE_22 -eq 1 ]; then
                # Cache hit
                return 1
        else
                # Cache miss
                return 0
        fi
}


# Checking that test object $TEST_URL is alredy cached

if ! check_url_for_cache_hit $TEST_URL ; then
    if ! check_url_for_cache_hit $TEST_URL ; then
        log_message CRITICAL "Test object $TEST_URL cannot be cached - aborting"
        echo "UNKNOWN: Test URL $URL_22 cannot not cached"
        exit $STATE_UNKNOWN
    fi
fi

# Prepare a temporary JSON file with details of the purge request
JSON_FILE=`mktemp`

( echo '{'
  echo  "\"domainName\":\"$TEST_DOMAIN\","
  echo  '"purges": ['
  echo  '    {'
  echo  '     "url": {'
  echo  '       "is_wildcard": true,'
  echo  "       \"expression\": \"$TEST_OBJECT\""
  echo  '    }'
  echo  '  }'
  echo  '  ]'
  echo  '}'
) > $JSON_FILE

TMP=`mktemp`

# Send an API request to purge the test object
curl -s -u "$API_USER:$API_PASS" -X POST -H "Content-Type: application/json" -T $JSON_FILE $API_URL > $TMP

ERROR_CODE=$?

rm $JSON_FILE

if [ $ERROR_CODE -ne 0 ]; then
        log_message CRITICAL "Failed to send purge API request, curl status code $ERROR_CODE"
        echo "CRITICAL: Failed to send purge API request, curl status code $ERROR_CODE"
        exit $STATE_CRITICAL
fi

json=`cat $TMP`
rm -f $TMP

prop="request_id"
REQUEST_ID=`jsonval`
prop="status"
STATUS=`jsonval | cut -f2 -d\:`

if [ "$STATUS" != "202" ]; then
        log_message CRITICAL "Returned API status code is not 202 (actual return code is $STATUS)"
        echo "CRITICAL: Returned API status code is not 202 (actual return code is $STATUS)"
        exit $STATE_CRITICAL
fi

if [ -z "$REQUEST_ID" ]; then
        log_message CRITICAL "API call returned empty request_id field"
        echo "CRITICAL: API call returned empty request_id field"
        exit $STATE_CRITICAL
fi

TIME_TO_PURGE=0

for i in `seq 1 $PURGE_TIMEOUT`; do
        # Checking for purge request status
        curl -s -d "{\"req_id\":\"$REQUEST_ID\"}" -H "Content-Type: application/json" $API_CHECKSTATUS_URL > $TMP
        ERROR_CODE=$?

        if [ $ERROR_CODE -ne 0 ]; then
                log_message CRITICAL "Failed to send checkStatus API request, curl status code $ERROR_CODE"
                echo "CRITICAL: Failed to send checkStatus API request, curl status code $ERROR_CODE"
                exit $STATE_CRITICAL
        fi

        json=`cat $TMP`
        rm -f $TMP

        prop="message"
        MESSAGE=`jsonval`
        prop="status"
        STATUS=`jsonval | cut -f2 -d\:`

        if [ "$STATUS" = "200" -a "$MESSAGE" = "Purge Successful" ]; then
                TIME_TO_PURGE=$i
                break
        fi
        sleep 1
done

if [ $TIME_TO_PURGE -eq 0 ]; then
        log_message ERROR "Failed to complete the object purge operations within $PURGE_TIMEOUT seconds"
        echo "CRITICAL: Failed to complete the object purge operation within $PURGE_TIMEOUT seconds | PurgeTime=$PURGE_TIMEOUT;;;"
        exit $STATE_CRITICAL
fi

if check_url_for_cache_hit $TEST_URL ; then
        log_message ERROR "Test object $TEST_URL is still cached"
        echo "CRITICAL: Test object $TEST_URL is still cached"
        exit $STATE_CRITICAL
        exit 1
fi

if [ $TIME_TO_PURGE -ge $CRITICAL ]; then
        log_message CRITICAL "Completed the purge API test within $TIME_TO_PURGE seconds"
        echo "CRITICAL: Completed the purge API test within $TIME_TO_PURGE seconds | PurgeTime=$TIME_TO_PURGE;;;"
        exit $STATE_CRITICAL
fi

if [ $TIME_TO_PURGE -ge $WARNING ]; then
        log_message WARNING "Completed the purge API test within $TIME_TO_PURGE seconds"
        echo "WARNING: Completed the purge API test within $TIME_TO_PURGE seconds | PurgeTime=$TIME_TO_PURGE;;;"
        exit $STATE_WARNING
fi

log_message INFO "Completed the purge API test within $TIME_TO_PURGE seconds"
echo "OK: Completed the purge API test within $TIME_TO_PURGE seconds | PurgeTime=$TIME_TO_PURGE;;;"
exit $STATE_OK

