# -*- coding: utf-8 -*-
import pymongo
client = pymongo.MongoClient('localhost:27017')
db = client.gardens



def convert_sessagesimal_exif(s):

    def to_decimal(x):
        num, denom = x
        return float(num) / denom
    
    d, m, s = (to_decimal(i) for i in s)
    return (s/60 + m) / 60 + d


garden = 'Villa Sofía'
container_dir = '/tmp/pics/'
report = {'inserted': 0,
          'updated': 0}

import PIL.Image
import os
for name in os.listdir(container_dir):
    if not name.lower().endswith('.jpg'):
        continue
    img = PIL.Image.open(container_dir + name)
    exif_data = img._getexif()
    photo = {'name': name,
             'title': name,
             'garden': garden,
             'zoom': 16,}
    photo['lat'] = convert_sessagesimal_exif(exif_data[34853][2])
    if exif_data[34853][1] == u'S':
        photo['lat'] *= -1
    photo['lon'] = convert_sessagesimal_exif(exif_data[34853][4])
    if exif_data[34853][3] == u'W':
        photo['lon'] *= -1

    if db.photos.find_one({'name': name, 'garden': garden}):
        db.photos.update_one({'name': name, 'garden': garden}, {'$set': photo})
        report['updated'] += 1
    else:
        db.photos.insert_one(photo)
        report['inserted'] += 1

print report
