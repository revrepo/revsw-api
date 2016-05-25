from suds.client import Client
from suds_keepalive import HttpTransport
import logging
import urllib2

GAS_USERNAME = "PAR113265_revsw"
GAS_PASSWORD = "zqJFBSlaK234"

logging.basicConfig(level=logging.ERROR, format='%(message)s')
logger = logging.getLogger('gsapi')
logger.setLevel(logging.DEBUG)

""" Monkey patch urllib to make it keep alive friendly, this is needed because of global sign getApproverList and orderSan calls dance, that need to share a connection! """

class GlobalSignAPIException(Exception):
    pass

class GlobalSignAPI(object):
    """ Abstract class with helper function for global sign query and order api classes """
    
    def __init__(self):
#         self.client = Client(url=self.WSDL_URL, location=self.URL, transport=HttpTransport())
        self.client = Client(url=self.WSDL_URL, location=self.URL)

    def _create(self,object_type):
        """ helper for creating wsdl types """
        return self.client.factory.create(object_type)
    
    def _create_request(self,request_type):
        """ Special case for create request types, this adds the authentication headers """
        AuthToken = self._create('AuthToken')
        AuthToken.UserName = GAS_USERNAME
        AuthToken.Password = GAS_PASSWORD
        
        request = self._create(request_type)
        if hasattr(request,'OrderRequestHeader'):
            OrderRequestHeader = self._create('OrderRequestHeader')
            OrderRequestHeader.AuthToken = AuthToken
            request.OrderRequestHeader = OrderRequestHeader
        elif hasattr(request,'QueryRequestHeader'):
            QueryRequestHeader = self._create('QueryRequestHeader')
            QueryRequestHeader.AuthToken = AuthToken
            request.QueryRequestHeader = QueryRequestHeader
        
        return request
    
    def _raise_exception_if_error(self,response):
        """ Checkes the success code, if something went wrong, the error is translated to an exception """
        if hasattr(response,'OrderResponseHeader'):
            response_header = response.OrderResponseHeader
        elif hasattr(response,'QueryResponseHeader'):
            response_header = response.QueryResponseHeader
        else:
            raise GlobalSignAPIException("Could not find response header")
        
        if response_header.SuccessCode != 0:
            errors = list()
            for error in response_header.Errors.Error:
                if hasattr(error,'ErrorField'):
                    errors.append("%s %s %s" % (error.ErrorCode, error.ErrorField, error.ErrorMessage))
                else:
                    errors.append("%s %s" % (error.ErrorCode, error.ErrorMessage))
            raise GlobalSignAPIException("\n".join(errors))   
        
    def _call_api(self, method, request):
        """ Calls API method and checks for erros """
        try:
            response = getattr(self.client.service, method)(request)
        except urllib2.URLError, e:
            raise GlobalSignAPIException(e.reason)

        self._raise_exception_if_error(response)
        
        return response
        
        
class GlobalSignOrderAPI(GlobalSignAPI):
    URL = "https://system.globalsign.com/bb/ws/GasOrder"
    WSDL_URL = "https://system.globalsign.com/bb/ws/GasOrder?wsdl"
    
    def add_san(self,order_id,san,verification_type=None,ApproverEmail=None,AdditionalWildcardOption=False, operation="add"):
        """ Create san request and pass it to _gs_order """
        
#         print self.client
#         print self._create('CloudOvSanOrderByDnsVerificationRequest')
#         print "====="
#         print self._create('CloudOvSanOrderRequest')
#         print "===="
#         print self._create('CloudOvSanOrderByUrlVerificationRequest')
#         exit(1)
        
        if operation == "add":
            ModifyOperation = "ADDITION" #  can be ADDITION, DELETE, CANCEL
        elif operation == "del":
            ModifyOperation = "DELETE"
        elif operation == "cancel":
            ModifyOperation = "CANCEL" #  can be ADDITION, DELETE, CANCEL

        CloudSANEntry = self._create('CloudSANEntry')
        CloudSANEntry.ModifyOperation = ModifyOperation
        CloudSANEntry.CloudOVSAN = san
        if verification_type == 'email':
            if ApproverEmail is None:
                raise GlobalSignAPIException("Approver email must be set for email verification")
            CloudSANEntry.ApproverEmail = ApproverEmail
        
        if AdditionalWildcardOption:
            CloudSANEntry.AdditionalWildcardOption = True
        
        CloudSANEntries = self._create('CloudSANEntries')
        CloudSANEntries.CloudSANEntry = (CloudSANEntry,)
        
        OrderSanRequestParameter = self._create('OrderSanRequestParameter')
        OrderSanRequestParameter.CloudSANEntries = CloudSANEntries
        OrderSanRequestParameter.OrderID = order_id
        
        if operation != "add" or verification_type == "email":
            """ For email verification or anything but addition, always use the CloudOvSanOrderRequest """
            CloudOvSanOrderRequest = self._create_request('CloudOvSanOrderRequest')
            CloudOvSanOrderRequest.OrderRequestParameter = OrderSanRequestParameter
            response = self._call_api('CloudOVSANOrder', CloudOvSanOrderRequest)
        
        else:
            if verification_type == "url":
                CloudOvSanOrderByUrlVerificationRequest = self._create_request('CloudOvSanOrderByUrlVerificationRequest')
                CloudOvSanOrderByUrlVerificationRequest.OrderRequestParameter = OrderSanRequestParameter
                response = self._call_api('CloudOVSANOrderByURLVerification', CloudOvSanOrderByUrlVerificationRequest)
                
            elif verification_type == "dns":
                CloudOvSanOrderByDnsVerificationRequest = self._create_request('CloudOvSanOrderByDnsVerificationRequest')
                CloudOvSanOrderByDnsVerificationRequest.OrderRequestParameter = OrderSanRequestParameter
                response = self._call_api('CloudOVSANOrderByDNSVerification', CloudOvSanOrderByDnsVerificationRequest)
                return response.CloudOVSANInfo.TxtRecord
            else:
                raise GlobalSignAPIException("Unknown verification type")
        """ The call_api checkes the success code in the header, and raises exception, so it's ok to return true at this point """
        return True

    def issue_cert(self,OrderID):
        IssueCloudOvRequest = self._create_request('IssueCloudOvRequest')
        IssueCloudOvRequest.OrderID = OrderID
        response = self._call_api('IssueRequestForCloudOV', IssueCloudOvRequest)
        """ The call_api checkes the success code in the header, and raises exception, so it's ok to return true at this point """
        return True
    
    def verify_url(self,OrderID, san, url):
        ApproverURLEntry = self._create('ApproverURLEntry')
        ApproverURLEntry.CloudOVSAN = san
        ApproverURLEntry.ApproverURL = url
        ApproverURLEntries = self._create('ApproverURLEntries')
        ApproverURLEntries.ApproverURLEntry = (ApproverURLEntry,)
        UrlVerificationRequest = self._create_request('UrlVerificationRequest')
        UrlVerificationRequest.OrderID = OrderID
        UrlVerificationRequest.ApproverURLEntries = ApproverURLEntries
        self._call_api('URLVerification',UrlVerificationRequest)
        """ The call_api checkes the success code in the header, and raises exception, so it's ok to return true at this point """
        return True
    
    def verify_dns(self,OrderID, san, fqdn = None):
        if fqdn is None:
            fqdn = san
        ApproverDNSEntry = self._create('ApproverDNSEntry')
        ApproverDNSEntry.CloudOVSAN = san
        ApproverDNSEntry.ApproverFQDN = fqdn
        ApproverDNSEntries = self._create('ApproverDNSEntries')
        ApproverDNSEntries.ApproverDNSEntry = (ApproverDNSEntry,)
        DnsVerificationRequest = self._create_request('DnsVerificationRequest')
        DnsVerificationRequest.OrderID = OrderID
        DnsVerificationRequest.ApproverDNSEntries = ApproverDNSEntries
        self._call_api('DNSVerification',DnsVerificationRequest)
        return True
    
#     def resend_email(self, OrderID, san):
#         ResendEmail4CloudOvRequest = self._create_request('ResendEmail4CloudOvRequest')
#         ResendEmail4CloudOvRequest.OrderID = OrderID
#         ResendEmail4CloudOvRequest.CloudOVSAN = (san,)
#         return self._call_api('ResendApproverEmail',ResendEmail4CloudOvRequest)

class GlobalSignQueryAPI(GlobalSignAPI):
    URL = "https://system.globalsign.com/bb/ws/GasQuery"
    WSDL_URL = "https://system.globalsign.com/bb/ws/GasQuery?wsdl"
        
    SAN_STATUS_CODE = dict({
        '1': 'Waiting for approval',
        '2': 'Customer Approved', # according to documentation - waiting for phishing check. This is wrong.
        '3': 'Approved',
        '7': 'Flagged for phishing',
        '8': 'Canceled',
        '9': 'Deleted',
    })
    
    ORDER_STATUS_CODE = dict({
        '1': 'INITIAL',
        '2': 'Waiting for phishing check',
        '3': 'Cancelled - Not Issued',
        '4': 'Issue completed',
        '5': 'Cancelled - Issued',
        '6': 'Waiting for revocation',
        '7': 'Revoked',
    })

    def get_orders(self):
        OrderQueryOption = self._create('OrderQueryOption')
        OrderQueryOption.ReturnOrderOption = False
        OrderQueryOption.ReturnCertificateInfo = False
        OrderQueryOption.ReturnFulfillment = False
        OrderQueryOption.ReturnCACerts = False

        ModifiedCloudOvOrderRequest = self._create_request('ModifiedCloudOvOrderRequest')
        ModifiedCloudOvOrderRequest.OrderQueryOption = OrderQueryOption
        response = self._call_api('GetModifiedCloudOVOrders',ModifiedCloudOvOrderRequest)
        result = list()
        for order in response.OrderDetail:
            order_info = dict()
            order_info['domain'] = order.OrderInfo.DomainName
            order_info['order_id'] = order.OrderInfo.OrderID
            order_info['date'] = order.OrderInfo.OrderDate
            order_info['status'] = self.ORDER_STATUS_CODE[order.OrderInfo.OrderStatus]
            result.append(order_info)
        return result
        
    def get_order_details(self, order_id):
        """ Call GetCloudOVOrderByID to get full order information by order ID """
        
        OrderQueryOption = self._create('OrderQueryOption')
        OrderQueryOption.OrderStatus = True
        OrderQueryOption.ReturnOrderOption = True
        OrderQueryOption.ReturnCertificateInfo = True 
        OrderQueryOption.ReturnFulfillment = True
        OrderQueryOption.ReturnCACerts = True
        
        CloudOrderByOrderId = self._create_request('CloudOrderByOrderId')
        CloudOrderByOrderId.OrderQueryOption = OrderQueryOption        
        CloudOrderByOrderId.OrderID = order_id
        
        return self._call_api('GetCloudOVOrderByOrderID', CloudOrderByOrderId)
    
    def get_status(self, order_id):
        order_details = self.get_order_details(order_id)
        res = list()
        for san in order_details.OrderDetail.CloudOVSANInfo.CloudOVSANDetail:
#             print san
            san_dict = dict({
                'san': san.CloudOVSAN,
                'status': self.SAN_STATUS_CODE[san.CloudOVSANStatus],
            })
    
            try:
                san_dict['issue'] = san.IssueDate
            except AttributeError:
                san_dict['issue'] = None
    
            try:
                san_dict['order'] = san.OrderDate
            except AttributeError:
                san_dict['order'] = None
                
            try:
                san_dict['approval'] = san.ApprovalDate
            except AttributeError:
                san_dict['approval'] = None
            
            try:
                san_dict['complete'] = san.OrderCompleteDate
            except AttributeError:
                san_dict['complete'] = None
            
            try:
                san_dict['cancel'] = san.CancelDate
            except AttributeError:
                san_dict['cancel'] = None
                
            res.append(san_dict)
        return res
    
    def get_metatag(self,OrderID):
        order_details = self.get_order_details(OrderID)
        return order_details.OrderDetail.CloudOVSANInfo.MetaTag
    
    def get_fqdn(self,OrderID):
        order_info = self.get_order_details(OrderID)
        return order_info.OrderDetail.OrderInfo.DomainName
    
    def get_approvers(self,OrderID,san,FQDN=None):
        if FQDN is None:
            FQDN = self.get_fqdn(OrderID)
        CloudOvApproverListRequest = self._create_request('CloudOvApproverListRequest')
        CloudOvApproverListRequest.CloudOVSAN = (san,)
        CloudOvApproverListRequest.FQDN = FQDN
        CloudOvApproverListRequest.OrderID = OrderID
        response = self._call_api('GetCloudOVApproverList', CloudOvApproverListRequest)
        result = list()
        for approver in response.Approvers[0].Approver: 
            result.append(approver.ApproverEmail)
        return result
        
    def get_certs(self,OrderID):
        order_details = self.get_order_details(OrderID)
        certs = dict()
        certs['inter'] = list()
        certs['cert'] = order_details.OrderDetail.Fulfillment.ServerCertificate.X509Cert
        for cert in order_details.OrderDetail.Fulfillment.CACertificates.CACertificate:
            if cert.CACertType =="INTER":
                certs['inter'].append(cert.CACert)
            elif cert.CACertType =="ROOT":
                certs['root'] = cert.CACert
        return certs
        
# if __name__ == "__main__":
    # a few tests
#     try:
#         order_id = 'CECO1409260946'
        
#         gsqa = GlobalSignQueryAPI()
#         print gsqa.client
#         gsqa.get_approvers(order_id,"kosharovsky.com")
        

#          print gsoa.client
#         gsqa = GlobalSignQueryAPI()
#         fqdn = gsqa.get_fqdn(order_id)
#         print gsqa.get_approvers(order_id,san="how2ssl.com",FQDN=fqdn)


#         print gsoa.client
#          print gsoa.client
#         gsoa = GlobalSignOrderAPI()
#         print gsoa.client
#         print gsoa.resend_email(order_id, "how2ssl.com")
#         gsoa.order_san(order_id,"how2ssl.com","email",'admin@how2ssl.com')

#         print gsqa.client
#         exit(1)
#         print gsqa.get_order_details('CECO1409260946')
#         print 
#                 
#     except GlobalSignAPIException,e:
#         logger.fatal("Operation failed:")
#         logger.fatal(e.message)
#         exit(1)