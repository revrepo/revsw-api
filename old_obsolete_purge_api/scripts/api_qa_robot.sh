#!/bin/bash
#
# This scripts monitors the performance and functionality of Rev Purge API service.
# For a descriptiob of the script please see 
# https://revwiki.atlassian.net/wiki/display/OP/Nagios+Monitoring+for+Purge+API+Workflow
#

SCRIPTNAME=$0
PID=$$

# 

API_URL="https://TESTSJC20-API02.revsw.net/purge"
API_CHECKSTATUS_URL="https://TESTSJC20-API02.revsw.net/checkStatus"
API_USER="purge_api_test@revsw.com"
API_PASS="123456789123456789"
TEST_OBJECT="/test_object_purge_api.js"
TEST_OBJECT2="/test_object_purge_api01.js"
TEST_OBJECT3="/test-64k-file.jpg"
TEST_OBJECT4="/landing_hero.png"
TEST_OBJECT5="/test-cache.jpg"
RUNNUMBER=10

ALL_TEST_OBJECTS="$TEST_OBJECT $TEST_OBJECT2 $TEST_OBJECT3 $TEST_OBJECT4 $TEST_OBJECT5"
NON_JS_OBJECTS="$TEST_OBJECT3 $TEST_OBJECT4 $TEST_OBJECT5"
JS_OBJECTS="$TEST_OBJECT $TEST_OBJECT2"


TEST_DOMAIN="testsjc20-bp01.revsw.net"
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
TEST_URL2="http://"${TEST_DOMAIN}${TEST_OBJECT2}
TEST_URL3="http://"${TEST_DOMAIN}${TEST_OBJECT3}
TEST_URL4="http://"${TEST_DOMAIN}${TEST_OBJECT4}
TEST_URL5="http://"${TEST_DOMAIN}${TEST_OBJECT5}


echo -n "Checking status of API: "
STATUSCHECK=`curl -s https://TESTSJC20-API02.revsw.net/healthcheck | awk -v k="text" '{n=split($0,a,","); for (i=1; i<=n; i++) print a[i]}' | cut -f2 -d: | sed 's/[\"\}]//g' | grep 200 2>&1`

if [ $STATUSCHECK -ne 200 ]; then
                log_message CRITICAL "Failed - problem with API service $STATUSCHECK"
                echo "UNKNOWN: Failed - problem with API service $STATUSCHECK"
                exit $STATE_UNKNOWN
fi

echo "OK"


BPROXYLIST=`echo "db.MasterConfiguration.find({'domainName' : '"$TEST_DOMAIN"'})" | mongo 192.168.4.38/revportal | awk -v k="text" '{n=split($0,a,"]"); for (i=1; i<=n; i++) print a[i]}' | sed 's/\"\]\"/\|/g' | sed 's/[\"}\[,]//g' | grep bp_list | sed 's/^\S//'| cut -f3 -d:`
#BPROXYLIST="$BPROXYLIST $TEST_DOMAIN"

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

echo "BP(s) that will tested: "$BPROXYLIST
echo "Object to be tested: "$ALL_TEST_OBJECTS


function check_url_for_cache_hit () {
        URL_22=$1
        TMP_22=`mktemp`

	#
	#  HARD CODED HOST HEADER - JUST FOR NOW
	#

	curl -s -v --header 'Host: testsjc20-bp01.revsw.net' $URL_22  > $TMP_22 2>&1

        EXIT_CODE_22=$?
        if [ $EXIT_CODE_22 -ne 0 ]; then
                rm -f $TMP_22
                log_message CRITICAL "Failed to fetch URL $URL_22, curl exit code $EXIT_CODE_22"
                echo "UNKNOWN: Failed to fetch test URL $URL_22, curl exit code $EXIT_CODE_22"
                exit $STATE_UNKNOWN
        fi
        cat $TMP_22 | grep '< X-Rev-Cache: HIT' > /dev/null 2>&1
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
for i in $BPROXYLIST
do
	for p in $ALL_TEST_OBJECTS
	do
		TMP_URL="http://"${i}${p}
 		echo -n 'Testing for cache hit for' $TMP_URL ': '
		 if ! check_url_for_cache_hit $TMP_URL ; then
		    if ! check_url_for_cache_hit $TMP_URL ; then
			log_message CRITICAL "Test object $TMP_URL cannot be cached - aborting"
        		echo "UNKNOWN: Test URL $TMP_URL cannot not cached"
        		exit $STATE_UNKNOWN
    		    fi
		fi
		echo 'OK'
	done
done


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

# Prepare a temporary JSON file with details of the purge request for all .js files
JSON_FILE_PURGE_JS=`mktemp`

( echo '{'
  echo  "\"domainName\":\"$TEST_DOMAIN\","
  echo  '"purges": ['
  echo  '    {'
  echo  '     "url": {'
  echo  '       "is_wildcard": true,'
  echo  "       \"expression\": \"/*.js\""
  echo  '    }'
  echo  '  }'
  echo  '  ]'
  echo  '}'
) > $JSON_FILE_PURGE_JS

# Prepare a temporary JSON file with details of the purge request for all .js files
JSON_FILE_PURGE_REGEXP=`mktemp`

( echo '{'
  echo  "\"domainName\":\"$TEST_DOMAIN\","
  echo  '"purges": ['
  echo  '    {'
  echo  '     "url": {'
  echo  '       "is_wildcard": false,'
  echo  '	"expression": "\\.(png|jpg|css|js)$"'
  echo  '    }'
  echo  '  }'
  echo  '  ]'
  echo  '}'
) > $JSON_FILE_PURGE_REGEXP


JSON_FILES_ALL="$JSON_FILE $JSON_FILE_PURGE_JS $JSON_FILE_PURGE_REGEXP"




# Prepare a temporary BROKEN JSON file with details of the purge request

JSON_FILE_error=`mktemp`

( echo '{'
  echo  "\"domainName\":\"$TEST_DOMAIN\","
  echo  '"purges": ['
  echo  '    {'
  echo  '     "url": {'
  echo  '        is_wildcard": true,'
  echo  "       \"expression\": \"$TEST_OBJECT\""
  echo  '    }'
  echo  '  }'
  echo  '  ]'
  echo  '}'
) > $JSON_FILE_error




##########################
echo -n 'Testing API wrong username and wrong password: '
TMP=`mktemp`

curl -s -u "wrong:wrong" -X POST -H "Content-Type: application/json" -T $JSON_FILE $API_URL > $TMP
json=`cat $TMP`
rm -f $TMP

prop="request_id"
REQUEST_ID=`jsonval`
prop="status"
STATUS=`jsonval | cut -f2 -d\:`

if [ "$STATUS" != "405" ]; then
        log_message CRITICAL "Testing of API wrong username and wrong password failed"
        echo "CRITICAL: Returned API status code is not 405 (actual return code is $STATUS)"
        exit $STATE_CRITICAL
fi

echo 'OK'


##########################

echo -n 'Testing API right username and wrong passsword: '
TMP=`mktemp`

curl -s -u "$API_USER:wrong" -X POST -H "Content-Type: application/json" -T $JSON_FILE $API_URL > $TMP
json=`cat $TMP`
rm -f $TMP

prop="request_id"
REQUEST_ID=`jsonval`
prop="status"
STATUS=`jsonval | cut -f2 -d\:`

if [ "$STATUS" != "405" ]; then
        log_message CRITICAL "Testing of API right username and wrong password failed"
        echo "CRITICAL: Returned API status code is not 405 (actual return code is $STATUS)"
        exit $STATE_CRITICAL
fi

echo 'OK'


##########################
echo -n 'Testing API wrong username and right passsword: '

TMP=`mktemp`

curl -s -u "wrong:$API_PASS" -X POST -H "Content-Type: application/json" -T $JSON_FILE $API_URL > $TMP

json=`cat $TMP`
rm -f $TMP
prop="request_id"
REQUEST_ID=`jsonval`
prop="status"
STATUS=`jsonval | cut -f2 -d\:`

if [ "$STATUS" != "405" ]; then
        log_message CRITICAL "Testing of API wrong username and right password failed"
        echo "CRITICAL: Returned API status code is not 405 (actual return code is $STATUS)"
        exit $STATE_CRITICAL
fi

echo 'OK'


##########################

#echo -n 'Testing API right username and no passsword:                '
#TMP=`mktemp`

#curl -s -u "$API_USER" -X POST -H "Content-Type: application/json" -T $JSON_FILE $API_URL > $TMP
#json=`cat $TMP`
#rm -f $TMP

#prop="request_id"
#REQUEST_ID=`jsonval`
#prop="status"
#STATUS=`jsonval | cut -f2 -d\:`

#if [ "$STATUS" != "405" ]; then
#        log_message CRITICAL "Testing of API right username and wrong password failed"
#        echo "CRITICAL: Returned API status code is not 405 (actual return code is $STATUS)"
#        exit $STATE_CRITICAL
#fi

#echo 'OK'


##########################

echo -n 'Testing API right no username and no passsword: '
TMP=`mktemp`

curl -s  -X POST -H "Content-Type: application/json" -T $JSON_FILE $API_URL > $TMP 
json=`cat $TMP`
rm -f $TMP

prop="request_id"
REQUEST_ID=`jsonval`
prop="status"
STATUS=`jsonval | cut -f2 -d\:`

if [ "$STATUS" != "404" ]; then
        log_message CRITICAL "Testing of API right username and wrong password failed"
        echo "CRITICAL: Returned API status code is not 404 (actual return code is $STATUS)"
        exit $STATE_CRITICAL
fi

echo 'OK'





##########################

echo -n 'Sending a broken JSON file: '

TMP=`mktemp`

# Send an API request to purge the test object
curl -s -u "$API_USER:$API_PASS" -X POST -H "Content-Type: application/json" -T $JSON_FILE_error $API_URL > $TMP
json=`cat $TMP`

ERROR_CODE=$?

rm $JSON_FILE_error

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

if [ "$STATUS" != "404" ]; then
        log_message CRITICAL "Broken JSON file was able to be pushed (actual return code is $STATUS)"
        echo "CRITICAL: Broken JSON file was able to be pushed (actual return code is $STATUS)"
        exit $STATE_CRITICAL
fi

echo 'OK'

###############################
####### START_OF_LOOP

COUNT=1

while [ $COUNT -le $RUNNUMBER ]
do



echo -n 'Sending an API request to purge the test object: '
TMP=`mktemp`

# Send an API request to purge the test object
curl -s -u "$API_USER:$API_PASS" -X POST -H "Content-Type: application/json" -T $JSON_FILE $API_URL > $TMP
json=`cat $TMP`

ERROR_CODE=$?


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
echo 'OK'

TIME_TO_PURGE=0

echo -n 'Sending an API request to purge the test object: '

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


echo "$TIME_TO_PURGE"

for i in $BPROXYLIST
do
	TMP_URL="http://"${i}${TEST_OBJECT}		
	echo -n 'Testing Purge timeout test on '$TMP_URL' count '$COUNT': '
	if check_url_for_cache_hit $TMP_URL ; then
        	log_message ERROR "Test object $TMP_URL is still cached"
        	echo "CRITICAL: Test object $TMP_URL is still cached"
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
	echo "OK"
done
#echo "OK: Completed the purge API test within $TIME_TO_PURGE seconds | PurgeTime=$TIME_TO_PURGE;;;"


# reload
# TEST_URL="http://"${TEST_DOMAIN}${TEST_OBJECT}
#
for i in $BPROXYLIST
do
        TMP_URL="http://"${i}${TEST_OBJECT}
        echo -n 'Testing for cache hit on '$TMP_URL' count' $COUNT ': '
	if ! check_url_for_cache_hit $TMP_URL ; then
		if ! check_url_for_cache_hit $TMP_URL ; then
        		log_message CRITICAL "Test object $TMP_URL cannot be cached - aborting"
        		echo "UNKNOWN: Test URL $TMP_URL cannot not cached"
        		exit $STATE_UNKNOWN
    		fi
	fi
	echo 'OK'
done

(( COUNT++ ))
done

rm $JSON_FILE

######## END_OF_LOOP
####################

# reload
for i in $BPROXYLIST
do
        TMP_URL="http://"${i}${TEST_OBJECT}
        echo -n 'populate cache '$TMP_URL' count' $COUNT ': '
        if ! check_url_for_cache_hit $TMP_URL ; then
                if ! check_url_for_cache_hit $TMP_URL ; then
                        log_message CRITICAL "Test object $TMP_URL cannot be cached - aborting"
                        echo "UNKNOWN: Test URL $TMP_URL cannot not cached"
                        exit $STATE_UNKNOWN
                fi
        fi
        echo 'OK'
done



#########  Purge *.js

###############################
####### START_OF_LOOP

COUNT=1

while [ $COUNT -le $RUNNUMBER ]
do


echo -n 'Sending an API request to purge *.js: '
TMP=`mktemp`

# Send an API request to purge the test object
curl -s -u "$API_USER:$API_PASS" -X POST -H "Content-Type: application/json" -T $JSON_FILE_PURGE_JS $API_URL > $TMP
json=`cat $TMP`

ERROR_CODE=$?

#rm $JSON_FILE_PURGE_JS

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
echo 'OK'

TIME_TO_PURGE=0

echo -n 'Testing Purge timeout: '
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

echo "$TIME_TO_PURGE"

for i in $BPROXYLIST
do
	for p in $JS_OBJECTS
	do
        	TMP_URL="http://"${i}${p}
	        echo -n 'Testing *.js Purge timeout test on '$TMP_URL' count' $COUNT ': '

		if check_url_for_cache_hit $TMP_URL ; then
       	 		log_message ERROR "Test object $TMP_URL is still cached"
        		echo "CRITICAL: Test object $TMP_URL is still cached"
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
		echo "OK"
	done
	log_message INFO "Completed the purge API test within $TIME_TO_PURGE seconds"

done

#echo "OK: Completed the purge API test within $TIME_TO_PURGE seconds | PurgeTime=$TIME_TO_PURGE;;;"

for i in $BPROXYLIST
do
	for p in $NON_JS_OBJECTS
	do

		# Making sure other objects are still in cache
		TMP_URL="http://"${i}${p}

		echo -n 'Checking that' $TMP_URL 'is still in cache: '

		if ! check_url_for_cache_hit $TMP_URL ; then
		        log_message ERROR "Test object $TMP_URL is not cached"
		        echo "CRITICAL: Test object $TMP_URL is not cached"
		        exit $STATE_CRITICAL
		        exit 1
		fi
		echo "OK"
	done
done
####


(( COUNT++ ))
done

#rm $JSON_FILE
rm $JSON_FILE_PURGE_JS



#############
#  Reload everything for RegExp Purge Test


# Checking that test object $TEST_URL is alredy cached
for i in $BPROXYLIST
do
        for p in $ALL_TEST_OBJECTS
        do
                TMP_URL="http://"${i}${p}
                echo -n 'Populating cache for object' $TMP_URL ': '
                 if ! check_url_for_cache_hit $TMP_URL ; then
                    if ! check_url_for_cache_hit $TMP_URL ; then
                        log_message CRITICAL "Test object $TMP_URL cannot be cached - aborting"
                        echo "UNKNOWN: Test URL $TMP_URL cannot not cached"
                        exit $STATE_UNKNOWN
                    fi
                fi
                echo 'OK'
        done
done
###############



####### START_OF_LOOP

COUNT=1

while [ $COUNT -le $RUNNUMBER ]
do


echo -n 'Sending an API request to purge REGEXP: '
TMP=`mktemp`

# Send an API request to purge the test object
curl -s -u "$API_USER:$API_PASS" -X POST -H "Content-Type: application/json" -T $JSON_FILE_PURGE_REGEXP $API_URL > $TMP
json=`cat $TMP`

ERROR_CODE=$?


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
echo 'OK'

TIME_TO_PURGE=0

echo -n 'Testing Purge timeout: '
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

echo "$TIME_TO_PURGE"

for i in $BPROXYLIST
do
        for p in $ALL_TEST_OBJECTS
        do
                TMP_URL="http://"${i}${p}
                echo -n 'Testing REGEXP Purge timeout test on '$TMP_URL' count' $COUNT ': '

                if check_url_for_cache_hit $TMP_URL ; then
                        log_message ERROR "Test object $TMP_URL is still cached"
                        echo "CRITICAL: Test object $TMP_URL is still cached"
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
                echo "OK"
        done
        log_message INFO "Completed the purge API test within $TIME_TO_PURGE seconds"

done

#echo "OK: Completed the purge API test within $TIME_TO_PURGE seconds | PurgeTime=$TIME_TO_PURGE;;;"

for i in $BPROXYLIST
do
        for p in $ALL_TEST_OBJECTS
        do
                # Making sure other objects are still in cache
                TMP_URL="http://"${i}${p}

                echo -n 'Checking that' $TMP_URL 'is still in cache: '

                if ! check_url_for_cache_hit $TMP_URL ; then
                        log_message ERROR "Test object $TMP_URL not cached"
                        echo "CRITICAL: Test object $TMP_URL not cached"
                        exit $STATE_CRITICAL
                        exit 1
                fi
                echo "OK"
        done
done
####


(( COUNT++ ))
done

rm $JSON_FILE_PURGE_REGEXP



#############




exit $STATE_OK

