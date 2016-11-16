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

```
curl -sL https://deb.nodesource.com/setup_6.x | sudo -E bash -
sudo apt-get install -y nodejs
```

ghini.web is a npm-based program. To get all further dependencies: `npm
install`. To start the server: `nodejs web.js`.

If npm gets confused, `rm -fr ./node_modules/` and try again.

Database Connection
===================

ghini.web works with the same databases as defined in ghini.desktop 1.1. The
geographic information defined in the desktop application is not only
unhandled by the web application.

Have a look at the `config.js` file and make sure the `database_url` matches
a data connection on your host.

For example, `'postgresql://bscratch:btest52@localhost/bscratch'` means that
you are using PosgreSQL on localhost, and you have created a `bscratch` role
with password `btest52`, owner of the `bscratch` database.

Log in as `postgres`, start `psql`, execute the following:

```
CREATE ROLE bscratch WITH LOGIN CREATEDB PASSWORD 'btest52';
CREATE DATABASE bscratch WITH OWNER bscratch;
```

Should you be using MariaDB/MySQL, the above would be:

```
CREATE USER bscratch@localhost IDENTIFIED BY 'btest52';
CREATE DATABASE bscratch;
GRANT ALL PRIVILEGES ON bscratch.* TO bscratch@localhost;
```

start ghini.desktop (1.1), configure it as to connect to your database, let
ghini.desktop initialize it, then you're set to run ghini.web too.

using it
========

* use ghini.desktop to populate the database,
* not yet decided how to do this, but you need define the coordinates of the plants,
* start `nodejs web.js`,
* look at your data on `http://localhost:5000/`,
* open issues to suggest how to change ghini.web.

