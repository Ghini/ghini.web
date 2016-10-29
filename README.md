ghini
=====

a web based interface to botanical garden databases

rationale
---------

ghini, the name is inspired to Luca Ghini, has the aim to offer a web-based
interface to a database complying to the ITF2 reccomendations.

the idea is born in august 2012, after Mario Frasca (mathematician) and
Saskia Bantjes (agronomist, environmentalist) get in contact with the
cuchubo garden in Mompox. the wish to describe it, the thankful words by the
president of the foundation named after the cuchubo garden, pushes the two
to seek formal help at the botanical garden of the utrecht university, where
they get support by the conservator Eric Gouda.

current plan
============

this program adds geographic awareness to bauble.classic

interaction between server and client is quite simple:

on startup, the client waits for the document to be ready, then informs the
server that it needs the coordinates of the plants. requests a 'refresh'.

on receiving a 'refresh' request, the server sends the requesting client the
complete list of plants with geographic coordinates.

clients may modify documents, on change they send the server the modified
document.

on any change in the database, the server broadcasts, to all clients, the
modified document. it may be a 'insert - document' or 'update - lookup -
document', where 'lookup' is a set of properties that uniquely identify a
document in the database.

future is unwritten, but check the issues page.

Setting Up
==========

Simply put: download the code, and install the dependencies.

First of all, you need a recent version of `nodejs`. The one bundled with
Debian8, and possibly with anything based on Debian, is v0.10.29, and that's
far too old. Follow the instructions on nodejs.org, or trust me and do the
following:

curl -sL https://deb.nodesource.com/setup_6.x | sudo -E bash -
sudo apt-get install -y nodejs

ghini.web is a npm-based program. To get all further dependencies: `npm
install`. To start the server: `nodejs web.js`.

If npm gets confused, `rm -fr ./node_modules/` and try again.

Database Connection
===================

ghini.web expects your data to be in a spatial database (initially we only
support PostgreSQL+PostGIS) and to match the model defined in ghini.desktop
1.1, with the addition of geographic information. The geographic information
is not unhandled by the desktop application. At a later stage support will
be added for SpatiaLite, and possibly other spatial databases.

Have a look at the `config.js` file and make sure the `database_url` matches
a data connection on your host.

For example, `'postgresql://bscratch:btest52@localhost/bscratch'` means that
you have created a `bscratch` role with password `btest52`, owner of the
`bscratch` database.

log in as `postgres`, start `psql`, execute the following:

CREATE ROLE bscratch WITH LOGIN CREATEDB PASSWORD 'btest52';
CREATE DATABASE bscratch WITH OWNER bscratch;

start ghini.desktop (1.1), let it initialize the database, then come back to
the `postgres` terminal and execute:

\c bscratch
CREATE EXTENSION postgis;
CREATE EXTENSION postgis_topology;
SELECT AddGeometryColumn ('', 'plant', 'coords', 4326, 'POINT', 0);

with SQLite, instead of the above, download the `init_spatialite.sql` script
and run it using the `spatialite` program, then execute `SELECT
AddGeometryColumn ('plant', 'coords', 4326, 'POINT', 0);`

using it
========

use ghini.desktop to populate the database,
use QGIS, in particular Add Part, to add the geometry to each plant row,
start `nodejs web.js`,
look at your data on `http://localhost:5000/`,
open issues to suggest how to change ghini.web.

