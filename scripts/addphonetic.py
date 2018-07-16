# -*- coding: utf-8 -*-
# Copyright (c) 2015-2018 Mario Frasca <mario@anche.no>
#
# This file is part of ghini.web.
#
# ghini.web is free software: you can redistribute it and/or modify it under
# the terms of the GNU Affero General Public License as published by the Free
# Software Foundation, either version 3 of the License, or (at your option)
# any later version.
#
# ghini.web is distributed in the hope that it will be useful, but WITHOUT ANY
# WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS
# FOR A PARTICULAR PURPOSE. See the GNU Affero General Public License for more
# details.
#
# You should have received a copy of the GNU Affero General Public License
# along with ghini.web. If not, see <http://www.gnu.org/licenses/>.

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
