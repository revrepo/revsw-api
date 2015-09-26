#!/bin/bash
#Copyright 2013-2014 RevSoftware, Inc.
#Script prepared by Haranath
#Version 1.0

#Script is Used to start the RevPortal required dependencies
base_path=$PWD

#killing the processers
nodePids=$(pgrep node)
if [[ -n $nodePids ]] ; then
        killall -9 node
fi

#Starting the RevPortal Services
cd $base_path
forever start -o api.log index.js 


