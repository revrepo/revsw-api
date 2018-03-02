#!/bin/bash

# Log commands to stdout
set -o xtrace
# Exit on error
set -o errexit
# Exit on use of unset variables
set -o nounset
# Exit and report on pipe failure
set -o pipefail
export PWD=$(pwd)
rm -rf ${PWD}/data/db
mkdir -p ${PWD}/data/db/dump
cp -R ${PWD}/data/dump/ ${PWD}/data/db/dump
 
step=0
# Get major versions from https://hub.docker.com/r/library/mongo/tags/
for major_version in 2.6.12 3.0.14 3.2.11 3.4.1; do
    sudo docker stop some-mongo ||:
    sudo docker rm  -f some-mongo ||:
    sudo docker run --name some-mongo -p 27017:27017 -v ${PWD}/data/db:/data/db -d mongo:$major_version
    set +o errexit
    false; while [[ $? > 0 ]]; do
        sleep 0.5
        sudo docker exec -it some-mongo mongo --eval 'printjson((new Mongo()).getDBNames())' --verbose
    done
    set -o errexit
    if (( $step == 0 )); then
        sudo docker exec -it some-mongo mongorestore /data/db/dump --host localhost:27017 --verbose
        sleep 1
    fi
    ((step += 1))
done

# Finish with last mongodb version
sudo docker exec -it some-mongo mongo --eval 'db.adminCommand( { setFeatureCompatibilityVersion: "3.4" } )'
sudo docker stop some-mongo 
sudo docker rm -f  some-mongo
sleep 3
 
sudo docker run --name some-mongo -p 27017:27017 -v ${PWD}/data/db:/data/db -d mongo:3.6.3

# Make dump with mongo:3.6.3
sudo rm -rf ${PWD}/data/db/dump/*
sudo docker exec -it some-mongo bash -c 'cd /data/db; mongodump'
rm -rf ${PWD}/data/dump_3_6_3
cp -R ${PWD}/data/db/dump/ ${PWD}/data/dump_3_6_3
sleep 3 
