# pip install requests
import requests

url = 'https://crew.abxair.com/nlcrew/ui/netline/crew/crm-workspace/index.html#/iadp'
apikey = '65928336a6006dd32a2bdf37c19e9ae0e81d4ce5'
params = {
    'url': url,
    'apikey': apikey,
    'autoparse': 'true',
}
response = requests.get('https://api.zenrows.com/v1/', params=params)
print(response.text)
