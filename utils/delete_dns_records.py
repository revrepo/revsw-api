#!/usr/bin/python
#
# Use the script to delete junk records from NSONE
#

import json
import pycurl
import sys
import re
from StringIO import StringIO

AUTH = 'X-NSONE-Key: eeeeeeeeeeeeeeeee'
URL = 'https://api.nsone.net/v1/zones/revdn.net'

def curl_api(url, verb, authhead, *args):
    buffer = StringIO()
    c = pycurl.Curl()
    c.setopt(c.URL, url)
    c.setopt(c.CUSTOMREQUEST, verb)
    c.setopt(c.HTTPHEADER, [authhead])
    for arg in args:
        c.setopt(c.POSTFIELDS, arg)
    c.setopt(c.WRITEDATA, buffer)
    c.perform()
    c.close()
    return buffer.getvalue()

big_list = []

record = curl_api(URL, 'GET', AUTH)
z = json.loads(record)
for r in z['records']:
   domain = r['domain']
   if re.match(r'^qa-test-revadmin-14.*', domain):
      rec_type = r['type']
      big_list.append((domain, rec_type))
for x,y in big_list:
   dom = str(x)
   rec = str(y)
   print 'Deleting ' + dom + rec
   URI = URL + '/' + dom + '/' + rec
   curl_api(URI, 'DELETE', AUTH)
