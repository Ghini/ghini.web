# -*- coding: utf-8 -*-
import json
import pymongo
client = pymongo.MongoClient('localhost:27017')
db = client.gardens

for i in db.plants.find():
    if not i['garden'].startswith('Villa Sof'):
        continue
    newcode = '2016.' + ('0000' + i['code'])[-6:]
    db.plants.update_one({'_id': i['_id']}, {'$set': {'code': newcode}})
