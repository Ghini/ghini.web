import json
import pymongo
client = pymongo.MongoClient('localhost:27017')
db = client.gardens

family = {}
genera = {}
import csv
csv_reader = csv.reader(open('/home/mario/Local/github/Ghini/ghini.desktop/bauble/plugins/plants/default/family.txt'))
next(csv_reader, None)  # skip the headers
for i, row in enumerate(csv_reader):
    family[row[0]] = row[1]
csv_reader = csv.reader(open('/home/mario/Local/github/Ghini/ghini.desktop/bauble/plugins/plants/default/genus.txt'))
next(csv_reader, None)  # skip the headers
for i, row in enumerate(csv_reader):
    genera[row[1]] = family[row[3]]

for i in db.taxa.find():
    try:
        if i['rank'] == 'species':
            genus = i.get('ht-epithet', i.get('genus'))
            if genus is None and not i['name'].startswith('sp'):
                i['genus'] = i['name'].split(' ')[0]
                genus = i.get('ht-epithet', i.get('genus'))
            family = genera[genus]
        if i['rank'] == 'genus':
            family = genera[i.get('epithet', i.get('name'))]
        db.taxa.update_one({'_id': i['_id']}, {'$set': {'family': family}})
    except Exception, e:
        print i, type(e), e
