#!/bin/bash
#nodejs and mongodb installation
#script preaped by srikanth thota
#version 1.1
#This scripts runs under root only
if [ $UID -ne 0 ]
then
echo "Please run this script as root"
exit
fi
#Installing the nodeJS
if [ -d /opt/node-v0.10.24-linux-x64 ]
then
echo "node already installed"
else
cd /tmp
wget ftp://115.112.122.99:2333/node-v0.10.24-linux-x64.tar.gz
tar -xzf /tmp/node-v0.10.24-linux-x64.tar.gz -C /opt
fi
