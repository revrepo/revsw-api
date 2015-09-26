#!/bin/bash

PACKAGE=$1

PACKAGEDIR=packages

if [ -z "$PACKAGE" ]; then
	echo "ERROR: Specify the package file name to deploy as a parameter of the script - aborting"
	exit 1
fi

for SERVER in TESTSJC20-API01.REVSW.NET TESTSJC20-API02.REVSW.NET; do
	echo "INFO: Copying package $PACKAGE file to server $SERVER..."
	scp $PACKAGEDIR/$PACKAGE robot@$SERVER:~/
	echo "INFO: Installing the new package..."
	ssh robot@$SERVER sudo dpkg -i $PACKAGE
	echo "INFO: Restarting the API service..."
	ssh robot@$SERVER sudo /etc/init.d/revsw-api restart
	echo "INFO: Done with server $SERVER"
done
