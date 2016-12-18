# -*- coding: utf-8 -*-
import json
import pymongo
client = pymongo.MongoClient('localhost:27017')
db = client.gardens

import re
shorten = lambda x: re.sub(r'([a-z])\1+', r'\1',
                           x.lower().replace('-', '').replace('ph', 'f')\
                           .replace('h', '').replace('c', 'k')\
                           .replace('q', 'k').replace('z', 's')\
                           .replace('ae', 'e').replace('y', 'i')\
                           .replace('e', 'i').replace('u', 'o'))

for i in db.taxa.find():
    db.taxa.update_one({'_id': i['_id']}, {'$set': {'phonetic': shorten(i['name'])}})
