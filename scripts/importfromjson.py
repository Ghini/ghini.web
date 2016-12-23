# -*- coding: utf-8 -*-
import json
import pymongo
client = pymongo.MongoClient('localhost:27017')
db = client.gardens

garden = u'Villa Sofía'
filename = '/tmp/villasofía.json'
content = json.load(open(filename))

## content has taxonomic information plus accessions, plants and plant
## notes. this is how our relational structure works. moreover, our
## relational structure forces our accessions to point to species, while we
## want to identify plants at different rank levels.

taxa = dict((d['epithet'], d) for d in content if d['object'] == 'taxon' and d['rank'] in ['family', 'familia', 'genus'])
for d in content:
    if d['object'] != 'taxon':
        continue
    if d['rank'] != 'species':
        continue
    hybrid_marker = d['hybrid'] and u'×' or ''
    name = d['ht-epithet'] + ' ' + hybrid_marker + (d.get('epithet') or d.get('infrasp1', 'sp'))
    infra_rank = d.get('infrasp1_rank')
    if infra_rank == 'var.':
        name = d['ht-epithet'] + ' ' + d.get('epithet') + ' var. ' + hybrid_marker + d.get('infrasp1')
    if infra_rank == 'cv.':
        name = d['ht-epithet'] + ' ' + hybrid_marker + d.get('epithet', 'sp') + ' \'' + d.get('infrasp1') + '\''
    taxa[name] = d

## now let's correct the workaround. accessions will point to species, we
## only look at the species to make sure they know they know what is the
## corresponding name. the corresponding name is itself unless the species
## was not completely identified, then it should be the epithet of the
## identified taxon.
for name, taxon in taxa.items():
    if taxon['rank'] != 'species':
        continue
    if name.lower().startswith('zzz'):
        # identified at family
        taxon['name'] = taxa[taxon['ht-epithet']]['ht-epithet']
    elif not taxon.get('epithet'):
        # identified at genus
        taxon['name'] = taxon['ht-epithet']
    else:
        # identified at species
        taxon['name'] = name

## our mongodb only focuses on taxa and plants. accession data is duplicated
## in every plant. plant notes are stored in separate objects. we first
## reconstruct the plant collection with explicit accession data and adding
## notes in the plant document.

accessions = dict((d['code'], d) for d in content if d['object'] == 'accession')
plants = dict((d['accession']+'.'+d['code'], d) for d in content if d['object'] == 'plant')

import re
re_tabsep = re.compile(r'(?P<lat>.*)\t(?P<lon>.*)')
re_xyz = re.compile(r'.*x:(?P<lon>.*);y:(?P<lat>.*);z:.*;.*')
re_latlon = re.compile(r'lat:(?P<lat>.*);lon:(?P<lon>.*).*')

for doc in content:
    if doc['object'] != 'plant_note':
        continue
    plant = plants[doc['plant']]
    if 'category' not in doc:
        doc['category'] = 'note'
    plant.setdefault(doc['category'], [])
    plant[doc['category']].append(doc['note'])
    if doc['category'].find('coords') != -1:
        for r in [re_tabsep, re_xyz, re_latlon]:
            m = r.match(doc['note'])
            if m:
                plant['lat'] = float(m.group('lat'))
                plant['lon'] = float(m.group('lon'))
    elif doc['category'].find('zoom') != -1:
        plant['zoom'] = int(doc['note'])        

## plants can point to documents in the taxa collection, and
## the taxa collection contains taxa at all rank level.

upserted = {'taxa': [0, 0],
            'plants': [0, 0]}

for name, taxon in taxa.items():
    if name != taxon.get('name'):
        continue
    if db.taxa.find_one({'name': name}):
        db.taxa.update_one({'name': name}, {'$set': taxon})
        upserted['taxa'][1] += 1
    else:
        db.taxa.insert_one(taxon)
        upserted['taxa'][0] += 1

for code, plant in plants.items():
    accession = accessions[plant['accession']]
    plant['species'] = taxa[accession['species']]['name']
    plant['garden'] = garden
    plant['code'] = code
    if db.plants.find_one({'code': code, 'garden': garden}):
        db.plants.update_one({'code': code, 'garden': garden}, {'$set': plant})
        upserted['plants'][1] += 1
    else:
        plant.setdefault('zoom', 18)
        db.plants.insert_one(plant)
        upserted['plants'][0] += 1

print upserted
