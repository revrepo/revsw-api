# This program is free software; you can redistribute it and/or modify
# it under the terms of the (LGPL) GNU Lesser General Public License as
# published by the Free Software Foundation; either version 3 of the 
# License, or (at your option) any later version.
#
# This program is distributed in the hope that it will be useful,
# but WITHOUT ANY WARRANTY; without even the implied warranty of
# MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
# GNU Library Lesser General Public License for more details at
# ( http://www.gnu.org/licenses/lgpl.html ).
#
# You should have received a copy of the GNU Lesser General Public License
# along with this program; if not, write to the Free Software
# Foundation, Inc., 59 Temple Place - Suite 330, Boston, MA 02111-1307, USA.
# written by: Jeff Ortel ( jortel@redhat.com )

"""
Contains classes for basic HTTP transport implementations.
"""

# import urllib2 as u2
# import urlgrabber.keepalive
# keepalive_handler = urlgrabber.keepalive.HTTPHandler()
# shared_u2opener = u2.build_opener(keepalive_handler)
import base64
import socket
from suds.transport import *
from suds.properties import Unskin
from urlparse import urlparse
from cookielib import CookieJar
import logging
import requests

socket.setdefaulttimeout(30)

log = logging.getLogger(__name__)
log.setLevel(logging.ERROR)

global_requests_session = requests.session()
class UnsupportedException(Exception):
    pass

class HttpTransport(Transport):
    """
    HTTP transport using urllib2.  Provided basic http transport
    that provides for cookies, proxies but no authentication.
    """
    
    def __init__(self, **kwargs):
        """
        @param kwargs: Keyword arguments.
            - B{proxy} - An http proxy to be specified on requests.
                 The proxy is defined as {protocol:proxy,}
                    - type: I{dict}
                    - default: {}
            - B{timeout} - Set the url open timeout (seconds).
                    - type: I{float}
                    - default: 90
        """
        log.debug("init suds_keepalive")
        Transport.__init__(self)
        Unskin(self.options).update(kwargs)
#         self.cookiejar = CookieJar()
#         self.proxy = {}
#         self.urlopener = None

        """ Global requests session """
        HttpTransport.requests = global_requests_session
        
    def open(self, request):
        try:
            url = request.url
            log.debug('opening (%s)', url)
            return HttpTransport.requests.get(url)
        except Exception, e:
            raise TransportError(str(e), e.code, e.fp)

    def send(self, request):
        result = None
        url = request.url

        msg = request.message
        headers = request.headers
        try:
#             u2request = u2.Request(url, msg, headers)
#             self.addcookies(u2request)
#             self.proxy = self.options.proxy
#             request.headers.update(u2request.headers)
            log.debug('sending:\n%s', request)
            
            response = HttpTransport.requests.post(url,data=msg)
            log.debug('Requests headers: %s' % response.request.headers)
#             self.getcookies(fp, u2request)
            result = Reply(200, response.headers, response.text)
            log.debug('received:\n%s', result)
            
        except Exception, e:
            if e.status_code in (202,204):
                result = None
            else:
                raise TransportError(e.msg, e.code, e.fp)
        return result

    def addcookies(self, u2request):
        """
            Not really doing anything.
        """
        pass
#         raise UnsupportedException()
#         self.cookiejar.add_cookie_header(u2request)
        
    def getcookies(self, fp, u2request):
        """
        Add cookies in the request to the cookiejar.
        @param u2request: A urllib2 request.
        @rtype: u2request: urllib2.Requet.
        """
        raise UnsupportedException()
#         self.cookiejar.extract_cookies(fp, u2request)
        
    def __deepcopy__(self, memo={}):
        clone = self.__class__()
        p = Unskin(self.options)
        cp = Unskin(clone.options)
        cp.update(p)
        return clone


class HttpAuthenticated(HttpTransport):
    """
    Provides basic http authentication for servers that don't follow
    the specified challenge / response model.  This implementation
    appends the I{Authorization} http header with base64 encoded
    credentials on every http request.
    """
    
    def __init__(self):
        raise UnsupportedException()
#     
#     def open(self, request):
#         self.addcredentials(request)
#         return HttpTransport.open(self, request)
#     
#     def send(self, request):
#         self.addcredentials(request)
#         return HttpTransport.send(self, request)
#     
#     def addcredentials(self, request):
#         credentials = self.credentials()
#         if not (None in credentials):
#             encoded = base64.encodestring(':'.join(credentials))
#             basic = 'Basic %s' % encoded[:-1]
#             request.headers['Authorization'] = basic
#                  
#     def credentials(self):
#         return (self.options.username, self.options.password)