echo  ==== Page information
curl https://api.statuspage.io/v1/pages/21mtcbv5tvch.json \
    -H "Authorization: OAuth d3345fe6-c1a4-4bb8-9cc5-a55978619e79"
echo ==== Search subscriber
curl https://api.statuspage.io/v1/pages/21mtcbv5tvch/subscribers.json?q='nikolay.gerzhan' \
    -H "Authorization: OAuth d3345fe6-c1a4-4bb8-9cc5-a55978619e79" 
# echo ==== subscribers
# curl https://api.statuspage.io/v1/pages/21mtcbv5tvch/subscribers.json \
#     -H "Authorization: OAuth d3345fe6-c1a4-4bb8-9cc5-a55978619e79"
# echo ==== Search subscriber
# curl https://api.statuspage.io/v1/pages/21mtcbv5tvch/subscribers.json?q="nikolaygerzhan@gmail.com" \
#     -H "Authorization: OAuth d3345fe6-c1a4-4bb8-9cc5-a55978619e79"
# echo ==== create subscriber
# curl https://api.statuspage.io/v1/pages/21mtcbv5tvch/subscribers.json \
#     -H "Authorization: OAuth d3345fe6-c1a4-4bb8-9cc5-a55978619e79" \
#     -X POST \
#     -d "subscriber[email]=nikolaygerzhan@gmail.com"
 
node ./services/statuspage.js 