#!/bin/bash

#
# Run the API test script against the local host (normally a development machine)
#

bash api_qa_robot.sh -u https://TESTSJC20-VICTORDEV01.REVSW.NET/purge -s https://TESTSJC20-VICTORDEV01.REVSW.NET/checkStatus -p 12345678 -d testsjc20-bp01.revsw.net
