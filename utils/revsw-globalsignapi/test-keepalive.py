import urllib2
import urlgrabber.keepalive
keepalive_handler = urlgrabber.keepalive.HTTPHandler()
opener = urllib2.build_opener(keepalive_handler)
urllib2.install_opener(opener)

host = "http://cnn.com" 
try:
    fo = urllib2.urlopen(host)
except:
    pass

try:
    fo = urllib2.urlopen(host)
except:
    pass
