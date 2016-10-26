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

setting up
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

database connection
===================

ghini.web expects your data to be in a PostgreSQL database, and to match the
model defined in ghini.desktop 1.0. Have a look at the `config.js`
file. Make sure the `database_url` matches a data connection on your host.

For example, `'postgresql://bscratch:btest52@localhost/bscratch'` means that
you have created a `bscratch` role with password `btest52`, owner of the
`bscratch` database.

log in as `postgres`, start `psql`, execute the following:

create role bscratch with login createdb password 'btest52';
create database bscratch with owner bscratch;

then start ghini.desktop and let it initialize the database.

using it
========

use ghini.desktop to populate the database,
start `nodejs web.js`,
look at your data on `http://localhost:5000/`,
open issues to suggest how to change ghini.web.