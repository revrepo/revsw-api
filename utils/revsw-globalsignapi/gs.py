import argparse
import gsapi
from sys import argv
import logging
from pprint import pprint

logging.basicConfig(level=logging.ERROR, format='%(message)s')
logger = logging.getLogger('gs')
logger.setLevel(logging.DEBUG)

def print_help():
    usage = """Front end for the GlobalSign API. 
    
That's what you can do with it:
    gs help - print help, the exact same help you are looking at.
    gs orders - search for avaiable orders. This will print only the latest order id for any given CN, and that is the order you should use for that CN.
    gs status ORDER_ID - check the status of the order id.
    gs add ORDER_ID SAN [verification type: email/url/dns] [APPROVER_EMAIL] - add SAN to order id, choose verification type, and if needed provide an email address.
    gs verifyurl ORDER_ID SAN URL - this will check for the metatag on the given url. Please note that url must be the top most page of the domain, no trailing slash.
    gs verifydns ORDER_ID SAN APPROVER_DNS- this will check for the txt record in APPROVER_DNS to verify SAN
    gs del ORDER_ID SAN - Delete this SAN from the certificate.
    gs cancel ORDER_ID SAN - Cancel verification request for this certificate.
    gs issue ORDER_ID - This will issue the certifiacte will all approved SAN's
    gs approvers ORDER_ID SAN - list of approvers for SAN. This is not required for the add operation. This is not required for the add command to work.
    gs cert ORDER_ID - get the server certificate.
    gs root ORDER_ID - get the root CA certficiate.
    gs inter ORDER_ID - get all the intermidiate certificates.
    gs chain ORDER_ID - get the certificate chain.
    gs metatag ORDER_ID - get the metatag needed for url verification of the given order.
        
"""
#     gs resend ORDER_ID SAN - resend verification email 
 
    logger.info(usage)

def print_help_exit_error():
    print_help()
    exit(1)

def parse_api_date(date):
    return date.strftime("%Y-%m-%d %H:%M")

def print_status(order_id):

    gsqa = gsapi.GlobalSignQueryAPI()
    res = gsqa.get_status(order_id)
    
    if len(res) == 0:
        print "No sans found for this order"
        return
    
    """ remove Cancel and Deleted san's"""
    clean_res = list()
    for san in res:
        if san['status'] in ('Deleted','Canceled'):
            continue
        else:
            clean_res.append(san)
    res = clean_res
    
    longest_san = 0
    for san in res:
        longest_san = max(longest_san, len(san['san']))
        for date_field in ('order','approval','issue','complete','cancel'):
            if san[date_field] is None:
                san[date_field] = str()
            else:
                san[date_field] = parse_api_date(san[date_field]) 
    
    format = "%%-%ds | %%-21s | %%-16s | %%-16s | %%-16s | %%-16s" % longest_san
    header = format % ("San","Status","Order","Approval","Issue","Complete")
    breaker = "-" * len(header)
    print header
    print breaker
    for san in res:
        print format % (san['san'],san['status'],san['order'],san['approval'],san['issue'],san['complete'])

def print_orders():
    gsqa = gsapi.GlobalSignQueryAPI()
    orders = gsqa.get_orders()
    by_cn = dict()
    for o in orders:
        if o['domain'] in by_cn.keys():
            if o['date'] > by_cn[o['domain']]['date']:
                by_cn[o['domain']] = o
        else:
            by_cn[o['domain']] = o
        
    longest_order = 0
    longest_domain = 0
    longest_status = 0
    for o in by_cn.values():
        longest_order = max(longest_order,len(o['order_id']))
        longest_domain = max(longest_domain,len(o['domain']))
        longest_status = max(longest_status,len(o['status']))
    
    format = "%%-%ds | %%-%ds | %%-%ds" % (longest_order, longest_domain, longest_status)
    header = format % ("Order","Domain","Status")
    breaker = "-" * len(header)
    print header
    print breaker   
    for o in by_cn.values():
        print format % (o['order_id'],o['domain'],o['status'])
        
def print_approvers(order_id, san):
    gsqa = gsapi.GlobalSignQueryAPI()
    for email in gsqa.get_approvers(order_id,san):
        print email

def add_san(order_id, san, verification_type, email=None):
    san = san.lower()
    if email is not None:
        email = email.lower()  

    if verification_type == 'email' and email is None:
        logger.error("Please provide an email for san verification. Execute the approvers command to get a list of valid approval emails.")
        exit(1)
        
    gsoa = gsapi.GlobalSignOrderAPI()
    if verification_type == "dns":
        txt = gsoa.add_san(order_id, san, verification_type , email)
        if not txt:
            logger.error("Something went wrong, not sure what. Switch to debug and start looking for bugs.")
            exit(1)
        else:
            print "Setup this txt value for the top level domain or the exact san in the dns zone: %s" % txt
            print "In case of wildcard, use the toplevel domain."
            print "Call verifydns once txt record setup is complete."
    else:
        if gsoa.add_san(order_id, san, verification_type , email):
            print "Done."
        else:
            logger.error("Something went wrong, not sure what. Switch to debug and start looking for bugs.")
            exit(1)

def del_san(order_id, san):
    san = san.lower()
        
    gsoa = gsapi.GlobalSignOrderAPI()
    if gsoa.add_san(order_id, san, operation="del"):
        print "Done."
    else:
        logger.error("Something went wrong, not sure what. Switch to debug and start looking for bugs.")
        exit(1)

def cancel_san(order_id, san):
    san = san.lower()
        
    gsoa = gsapi.GlobalSignOrderAPI()
    if gsoa.add_san(order_id, san, operation="cancel"):
        print "Done."
    else:
        logger.error("Something went wrong, not sure what. Switch to debug and start looking for bugs.")
        exit(1)

def issue_cert(order_id):
    gsoa = gsapi.GlobalSignOrderAPI()
    if gsoa.issue_cert(order_id):
        print "Done."
    else:
        logger.error("Something went wrong, not sure what. Switch to debug and start looking for bugs.")
        exit(1)

def verify_url(order_id, san,url):
    gsoa = gsapi.GlobalSignOrderAPI()
    if gsoa.verify_url(order_id, san, url):
         print "Done."
    else:
         logger.error("Something went wrong, not sure what. Switch to debug and start looking for bugs.")
         exit(1)

def verify_dns(order_id, san,fqdn=None):
    gsoa = gsapi.GlobalSignOrderAPI()
    if gsoa.verify_dns(order_id, san,fqdn):
         print "Done."
    else:
         logger.error("Something went wrong, not sure what. Switch to debug and start looking for bugs.")
         exit(1)
    
def print_certs(type,order_id):
    gsqa = gsapi.GlobalSignQueryAPI()
    certs = gsqa.get_certs(order_id)
    if type in ('cert','root'):
        print certs[type].rstrip("\n")
    elif type == 'inter':
        print "\n".join(certs['inter']).rstrip("\n")
    elif type == "chain":
        print certs['cert'].rstrip("\n")
        print "\n".join(certs['inter']).rstrip("\n")
        print certs['root'].rstrip("\n")

def print_metatag(order_id):
    gsqa = gsapi.GlobalSignQueryAPI()
    print gsqa.get_metatag(order_id) 

if __name__ == "__main__":
    if len(argv) == 1:
        print_help_exit_error()

    try:
        cmd = argv[1]
        
        if cmd == "help":
            print_help_exit_error()
        elif cmd == "status":
            if len(argv) < 3:
                logger.error("Please provide order id as a paramter")
                exit(1)
            print_status(argv[2])
        elif cmd == "approvers":
            if len(argv) < 4:
                logger.error("Please provide the order id and san you would like to get the approvers for.")
                exit(1)
            print_approvers(argv[2],argv[3])
        elif cmd=="add":
            if len(argv) < 5:
                logger.error("Please provide the following: order id, san, verification type (email,url,dns) and if required, and approver email.")
                exit(1)
            if argv[4] == "email":
                if len(argv) < 6:
                    logger.error("In case of email verificaiton you need to execute the approvers call and provide an email address to use for verification.")
                    exit(1)
                else:
                    add_san(argv[2],argv[3],argv[4],argv[5])
            else:
                """ verificatin type url and dns """
                add_san(argv[2],argv[3],argv[4])
        elif cmd=="del":
            if len(argv) < 4:
                logger.error("Please provide the following: order id and san.")
                exit(1)
            del_san(argv[2],argv[3])
        elif cmd=="cancel":
            if len(argv) < 4:
                logger.error("Please provide the following: order id and san.")
                exit(1)
            cancel_san(argv[2],argv[3])
        elif cmd=="cert" or cmd=="root" or cmd=="inter" or cmd=="chain":
            if len(argv) < 3:
                print "Please provide the order id"
                exit(1)
            print_certs(cmd,argv[2])
        elif cmd=="issue":
            if len(argv) < 3:
                logger.error("Please provide order id as a paramter")
                exit(1)
            issue_cert(argv[2])
        elif cmd=="orders":
            print_orders()
        elif cmd=="metatag":
            if len(argv) < 3:
                logger.error("Please provide order id as a paramter")
                exit(1)
            print_metatag(argv[2])
        elif cmd=="verifyurl":
            if len(argv) < 5:
                logger.error("Please provide the order id, the san you would like to verify and the url of the page you placed the metatag at.")
                exit(1)
            verify_url(argv[2],argv[3],argv[4])
        elif cmd=="verifydns":
            if len(argv) < 4:
                logger.error("Please provide the order id and the san you would like to verify.")
                exit(1)
            try:
                """ try with fqdn """
                verify_dns(argv[2],argv[3],argv[4])
            except IndexError:
                verify_dns(argv[2],argv[3])
        elif cmd=="_query":
            """ Undocumented development candy """
            gsqa = gsapi.GlobalSignQueryAPI()
            print gsqa.client
            try:
                t = gsqa._create(argv[2])
                print t
            except IndexError:
                pass

        elif cmd=="_order":
            """ Undocumented development candy """
            gsoa = gsapi.GlobalSignOrderAPI()
            print gsoa.client
            try:
                t = gsoa._create(argv[2])
                print t
            except IndexError:
                pass
        else:
            print "Not sure what you were trying to do. Here is the usage help.\n\n"
            print_help_exit_error()
    except gsapi.GlobalSignAPIException,e:
        logger.fatal("Exception returned from the GlobalSign API:")
        logger.fatal(e.message)
        exit(1)
