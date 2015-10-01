#!/bin/bash

#
# This script builds Rev API Debian package
#

if [ -z "$WORKSPACE" ]; then
	echo "ERROR: WORKSPACE env. variable is not set"
	exit 1
fi

if [ -z "$BUILD_NUMBER" ]; then
	echo "ERROR: BUILD_NUMBER env. variable is not set"
	exit 1
fi

if [ -z "$VERSION" ]; then
	VERSION=2.0.$BUILD_NUMBER
	echo "INFO: VERSION env variable is not set - setting it to $VERSION"
fi

CODEDIR=revsw-api

if [ ! -d $CODEDIR ]; then
	echo "ERROR: Cannot find directory $CODEDIR"
	echo "ERROR: Please run the script from the top of Portal repo clone directory"
	exit 1
fi

PACKAGEDIR=packages

if [ ! -d $PACKAGEDIR ]; then
	echo "INFO: Directory $PACKAGEDIR does not exist - creating it..."
	mkdir $PACKAGEDIR
	if [ $? -ne 0 ]; then
		echo "ERROR: Failed to create directory $PACKAGEDIR - aborting"
		exit 1
	fi
fi

dat=`date +%Y_%m_%d_%H_%M_%S`

WORKDIR=revsw-api'_'$VERSION'_'$dat 
mkdir $WORKDIR
cd $WORKDIR


foldername=revsw-api'_'$VERSION
mkdir -p $foldername/DEBIAN
touch $foldername/DEBIAN/control

PackageName=revsw-api
PackageVersion=$VERSION
MaintainerName="Victor Gartvich"
MaintainerEmail=victor@revsw.com

echo "Package: $PackageName
Version: $PackageVersion
Architecture: amd64
Maintainer: $MaintainerName <$MaintainerEmail>
Installed-Size: 26
Section: unknown
Priority: extra
Homepage: www.revsw.com
Description: Rev Customer API Application" >> $foldername/DEBIAN/control

mkdir -p $foldername/etc/init.d  $foldername/etc/logrotate.d

cp -rp $WORKSPACE/scripts/init.d_revsw-api  $foldername/etc/init.d/revsw-api

cp -rp $WORKSPACE/revsw-api/config/logrotate_revsw-api $foldername/etc/logrotate.d/revsw-api

mkdir -p $foldername/opt/$PackageName 

cp -rf  $WORKSPACE/revsw-api/*  $foldername/opt/$PackageName/

mkdir -p $foldername/opt/$PackageName/log

dpkg -b $foldername $WORKSPACE/$PACKAGEDIR/$foldername.deb
 
