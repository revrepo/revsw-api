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
	VERSION=1.0.$BUILD_NUMBER
	echo "INFO: VERSION env variable is not set - setting it to $VERSION"
fi

PACKAGENAME=revsw-api

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

WORKDIR=$PACKAGENAME'_'$VERSION'_'$dat 
mkdir $WORKDIR
cd $WORKDIR

if [ $? -ne 0 ]; then
  echo "FATAL: Failed to CD to directory $WORKDIR"
  exit 1
fi


foldername=$PACKAGENAME'_'$VERSION

mkdir -p $foldername/DEBIAN
touch $foldername/DEBIAN/control

PackageName=$PACKAGENAME
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
Description: Rev Customer API Service" >> $foldername/DEBIAN/control

mkdir -p $foldername/etc/init.d  $foldername/etc/logrotate.d

cp -rp $WORKSPACE/scripts/init.d_revsw-api  $foldername/etc/init.d/revsw-api

cp -rp $WORKSPACE/scripts/logrotate_revsw-api $foldername/etc/logrotate.d/revsw-api

mkdir -p $foldername/opt/$PackageName/config
mkdir -p $foldername/opt/$PackageName/docs

cp -rf  $WORKSPACE/bin  $foldername/opt/$PackageName/
cp -rf  $WORKSPACE/lib  $foldername/opt/$PackageName/
cp -rf  $WORKSPACE/node_modules  $foldername/opt/$PackageName/
cp -rf  $WORKSPACE/config/config.js.def  $foldername/opt/$PackageName/config
cp -rf  $WORKSPACE/package.json $foldername/opt/$PackageName/
cp -rf  $WORKSPACE/templates $foldername/opt/$PackageName/
cp -rf  $WORKSPACE/public $foldername/opt/$PackageName/
cp -rf  $WORKSPACE/docs/revsw-api.txt $foldername/opt/$PackageName/docs/

mkdir -p $foldername/opt/$PackageName/log

sudo chown -R root:root $foldername

dpkg -b $foldername $WORKSPACE/$PACKAGEDIR/$foldername.deb
 
